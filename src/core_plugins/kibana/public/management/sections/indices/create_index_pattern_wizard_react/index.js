import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { render } from 'react-dom';
import { sortBy, get } from 'lodash';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiSwitch,
  EuiPanel,
  EuiSpacer,
  EuiLink,
  EuiButton,
  EuiIcon,
  EuiHorizontalRule,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPagination,
  EuiPopover,
} from '@elastic/eui';
import { documentationLinks } from 'ui/documentation_links';
import { appendWildcard } from '../create_index_pattern_wizard/step_index_pattern/lib/append_wildcard';

// This isn't ideal. We want to avoid searching for 20 indices
// then filtering out the majority of them because they are sysetm indices.
// We'd like to filter system indices out in the query
// so if we can accomplish that in the future, this logic can go away
const ESTIMATED_NUMBER_OF_SYSTEM_INDICES = 20;
const MAX_NUMBER_OF_MATCHING_INDICES = 20;
const MAX_SEARCH_SIZE = MAX_NUMBER_OF_MATCHING_INDICES + ESTIMATED_NUMBER_OF_SYSTEM_INDICES;
const PER_PAGE_INCREMENTS = [5, 10, 20, 50];
const ILLEGAL_CHARACTERS = ['\\', '/', '?', '"', '<', '>', '|', ' '];

async function getIndices(es, rawPattern, limit = MAX_SEARCH_SIZE) {
  const pattern = rawPattern.trim();

  // Searching for `*:` fails for CCS environments. The search request
  // is worthless anyways as the we should only send a request
  // for a specific query (where we do not append *) if there is at
  // least a single character being searched for.
  if (pattern === '*:') {
    return [];
  }

  const params = {
    index: pattern,
    ignore: [404],
    body: {
      size: 0, // no hits
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: limit,
          }
        }
      }
    }
  };

  try {
    const response = await es.search(params);
    if (!response || response.error || !response.aggregations) {
      return [];
    }

    return sortBy(response.aggregations.indices.buckets.map(bucket => {
      return {
        name: bucket.key
      };
    }), 'name');
  }
  catch (err) {
    const type = get(err, 'body.error.caused_by.type');
    if (type === 'index_not_found_exception') {
      // This happens in a CSS environment when the controlling node returns a 500 even though the data
      // nodes returned a 404. Remove this when/if this is handled: https://github.com/elastic/elasticsearch/issues/27461
      return [];
    }
    throw err;
  }
}

function getWhitelistedIndices(indices, isIncludingSystemIndices) {
  if (!indices) {
    return indices;
  }

  const acceptableIndices = isIncludingSystemIndices
    ? indices
    // All system indices begin with a period.
    : indices.filter(index => !index.name.startsWith('.'));

  return acceptableIndices.slice(0, MAX_NUMBER_OF_MATCHING_INDICES);
}

function isIndexPatternQueryValid(pattern) {
  if (!pattern || !pattern.length) {
    return false;
  }

  if (pattern === '.' || pattern === '..') {
    return false;
  }

  return !ILLEGAL_CHARACTERS.some(char => pattern.includes(char));
}

class CreateIndexPatternWizard extends Component {
  static propTypes = {
    loadingDataDocUrl: PropTypes.string.isRequired,
    services: PropTypes.shape({
      es: PropTypes.object.isRequired,
    }).isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      step: 1,
      query: '',
      initialIndices: [],
      matchingIndices: [],
      isInitiallyLoadingIndices: true,
      isLoadingIndices: false,
      isIncludingSystemIndices: false,
      page: 0,
      perPage: PER_PAGE_INCREMENTS[0],
      isPerPageControlOpen: false,
      showIndexPatternQueryErrors: false,
    };
  }

  async componentDidMount() {
    setTimeout(async () => {
      const { services } = this.props;
      const initialIndices = await getIndices(services.es, `*`);
      this.setState({ initialIndices, isInitiallyLoadingIndices: false });
    });
  }

  fetchIndices = (query) => {
    this.setState({ isLoadingIndices: true });
    setTimeout(async () => {
      const { services } = this.props;
      const matchingIndices = await getIndices(services.es, `${query}*`);
      this.setState({ matchingIndices, isLoadingIndices: false });
    }, 500);
  }

  onChangeIncludingSystemIndices = () => {
    this.setState(state => ({
      isIncludingSystemIndices: !state.isIncludingSystemIndices,
    }));
  }

  onQueryChanged = (e) => {
    const target = e.target;
    let query = appendWildcard(e.nativeEvent, this.state.query);
    if (!query) {
      query = e.target.value;
    }
    else {
      setTimeout(() => target.setSelectionRange(1, 1));
    }
    this.setState({ query, showIndexPatternQueryErrors: !!query.length });
    this.fetchIndices(query);
  }

  onChangePage = page => {
    this.setState({ page });
  }

  onChangePerPage = perPage => {
    this.setState({ perPage });
    this.closePerPageControl();
  }

  openPerPageControl = () => {
    this.setState({ isPerPageControlOpen: true });
  }

  closePerPageControl = () => {
    this.setState({ isPerPageControlOpen: false });
  }

  getWhitelistedPartialMatchingIndices() {
    const {
      matchingIndices,
      isIncludingSystemIndices
    } = this.state;

    return getWhitelistedIndices(matchingIndices, isIncludingSystemIndices);
  }

  getWhitelistedExactMatchingIndices() {
    const {
      matchingIndices,
      isIncludingSystemIndices,
      query,
    } = this.state;

    const exactIndices = matchingIndices.filter(({ name }) => {
      if (name === query) {
        return true;
      }
      if (query.endsWith('*') && name.indexOf(query.substring(0, query.length - 1)) === 0) {
        return true;
      }
      return false;
    });

    return getWhitelistedIndices(exactIndices, isIncludingSystemIndices);
  }

  getWhitelistedInitialIndices() {
    const {
      initialIndices,
      isIncludingSystemIndices
    } = this.state;
    return getWhitelistedIndices(initialIndices, isIncludingSystemIndices);
  }

  getPaginatedIndices(indices) {
    const { page, perPage } = this.state;

    return indices.slice(page * perPage, Math.min(page * perPage + perPage, indices.length));
  }

  getIndicesToShowInList() {
    const initialIndices = this.getWhitelistedInitialIndices();
    const partialMatchingIndices = this.getWhitelistedPartialMatchingIndices();
    const exactMatchingIndices = this.getWhitelistedExactMatchingIndices();

    let indices;
    if (exactMatchingIndices.length) {
      indices = exactMatchingIndices;
    }
    else if (partialMatchingIndices.length) {
      indices = partialMatchingIndices;
    }
    else {
      indices = initialIndices;
    }

    return indices;
  }

  renderHeader() {
    const { isIncludingSystemIndices } = this.state;

    return (
      <div>
        <EuiSpacer size="s"/>
        <EuiTitle>
          <h1>Create index pattern</h1>
        </EuiTitle>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                <EuiTextColor color="subdued">
                  Kibana uses index patterns to retrieve data from Elasticsearch indices for things like visualizations.
                </EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Include system indices"
              checked={isIncludingSystemIndices}
              onChange={this.onChangeIncludingSystemIndices}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer/>
      </div>
    );
  }

  renderInitialLoadingState() {
    const { isInitiallyLoadingIndices } = this.state;

    if (!isInitiallyLoadingIndices) {
      return null;
    }

    return (
      <EuiPanel paddingSize="l">
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <EuiTextColor color="subdued">
                <h2 style={{ textAlign: 'center' }}>Checking for Elasticsearch data</h2>
              </EuiTextColor>
            </EuiTitle>
            <EuiSpacer size="s"/>
            <EuiText size="s">
              <p style={{ textAlign: 'center' }}>
                <EuiIcon type="faceSad"/>
                <EuiTextColor color="subdued">
                  Reticulating splines...
                </EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  renderInitialEmptyState() {
    const { initialIndices, isInitiallyLoadingIndices } = this.state;
    const { loadingDataDocUrl } = this.props;

    if (initialIndices.length > 0 || isInitiallyLoadingIndices) {
      return null;
    }

    return (
      <EuiPanel paddingSize="l">
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <EuiTextColor color="subdued">
                <h2 style={{ textAlign: 'center' }}>Couldn&apos;t find any Elasticsearch data</h2>
              </EuiTextColor>
            </EuiTitle>
            <EuiSpacer size="s"/>
            <EuiText>
              <p>
                <EuiTextColor color="subdued">
                  You&apos;ll need to index some data into Elasticsearch before you can create an index pattern.
                </EuiTextColor>
                &nbsp;
                <EuiLink
                  href={loadingDataDocUrl}
                  target="_blank"
                >
                  Learn how.
                </EuiLink>
              </p>
            </EuiText>
            <EuiSpacer size="xs"/>
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton iconType="faceHappy">
                  Check for new data
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  renderStepOne() {
    const {
      initialIndices,
      isInitiallyLoadingIndices,
      step,
      query,
      showIndexPatternQueryErrors,
    } = this.state;

    if (initialIndices.length === 0 || isInitiallyLoadingIndices || step !== 1) {
      return null;
    }

    const indices = this.getWhitelistedExactMatchingIndices();
    let containsErrors = false;
    const errors = [];
    const characterList = ILLEGAL_CHARACTERS.slice(0, ILLEGAL_CHARACTERS.length - 1).join(', ');

    if (!isIndexPatternQueryValid(query)) {
      errors.push(`Your input contains invalid characters or spaces. Please omit: ${characterList}`);
      containsErrors = true;
    }

    return (
      <EuiPanel paddingSize="m">
        <EuiTitle>
          <h2>
            Step 1 of 2: Define index pattern
          </h2>
        </EuiTitle>
        <EuiHorizontalRule margin="s"/>
        <EuiForm
          isInvalid={showIndexPatternQueryErrors && containsErrors}
        >
          <EuiFormRow
            label="Index pattern"
            isInvalid={showIndexPatternQueryErrors && containsErrors}
            error={errors}
          >
            <EuiFieldText
              name="indexPattern"
              placeholder="index-name-*"
              value={query}
              isInvalid={showIndexPatternQueryErrors && containsErrors}
              onChange={this.onQueryChanged}
            />
          </EuiFormRow>
        </EuiForm>
        <EuiSpacer size="xs"/>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiTextColor color="subdued">
                You can use a <strong>*</strong> as a wildcard in your index pattern.
              </EuiTextColor>
            </EuiText>
            <EuiText size="s">
              <EuiTextColor color="subdued">
                You can&apos;t use empty spaces or the characters <strong>{characterList}</strong>.
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="arrowRight"
              onClick={this.goToNextStep}
              isDisabled={containsErrors || indices.length === 0}
            >
              Next step
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s"/>
        <EuiPanel paddingSize="m">
          {this.renderStepOneLoadingState()}
          {this.renderStepOneStatusMessage()}
          <EuiSpacer size="s"/>
          {this.renderStepOneList()}
          <EuiSpacer size="m"/>
          {this.renderStepOnePagination()}
        </EuiPanel>
      </EuiPanel>
    );
  }

  renderStepOneLoadingState() {
    const { isLoadingIndices } = this.state;

    if (!isLoadingIndices) {
      return null;
    }

    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <EuiTextColor color="subdued">
              Looking for matching indices...
            </EuiTextColor>
          </EuiText>
          <EuiText size="s" style={{ textAlign: 'center' }}>
            <EuiTextColor color="subdued">
              Just a sec...
            </EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderStepOneStatusMessage() {
    const { query, isLoadingIndices } = this.state;
    if (isLoadingIndices) {
      return null;
    }

    const initialIndices = this.getWhitelistedInitialIndices();
    const exactMatchingIndices = this.getWhitelistedExactMatchingIndices();
    const partialMatchingIndices = this.getWhitelistedPartialMatchingIndices();

    let statusIcon;
    let statusMessage;
    let statusColor;

    if (query.length === 0) {
      statusIcon = null;
      statusColor = 'primary';
      statusMessage = initialIndices.length > 1
        ? (
          <span>
            Your index pattern can match any of your <strong>{initialIndices.length} indices</strong>, below.
          </span>
        )
        : (<span>You only have a single index. You can create an index pattern to match it.</span>);
    }
    else if (exactMatchingIndices.length) {
      statusIcon = 'check';
      statusColor = 'secondary';
      statusMessage = (
        <span>
          <strong>Success!</strong>
          &nbsp;
          Your index pattern matches <strong>{exactMatchingIndices.length} {exactMatchingIndices.length > 1 ? 'indices' : 'index'}</strong>.
        </span>
      );
    }
    else if (partialMatchingIndices.length) {
      statusIcon = null;
      statusColor = 'primary';
      statusMessage = (
        <span>
          Your index pattern doesn&apos;t match any indices, but you have
          <strong>
            {partialMatchingIndices.length} {partialMatchingIndices.length > 1 ? 'indices' : 'index'}
          </strong>
          which {partialMatchingIndices.length > 1 ? 'look' : 'looks'} similar.
        </span>
      );
    }
    else if (initialIndices.length) {
      statusIcon = null;
      statusColor = 'primary';
      statusMessage = (
        <span>
          The index pattern you&apos;ve entered doesn&apos;t match any indices.
          You can match any of your <strong>{initialIndices.length} indices</strong>, below.
        </span>
      );
    }

    return (
      <EuiText size="s">
        <EuiTextColor color={statusColor}>
          { statusIcon ? <EuiIcon type={statusIcon}/> : null }
          {statusMessage}
        </EuiTextColor>
      </EuiText>
    );
  }

  renderStepOnePagination() {
    const { isPerPageControlOpen, page, perPage, isLoadingIndices } = this.state;

    if (isLoadingIndices) {
      return null;
    }

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.openPerPageControl}
      >
        Rows per page: {perPage}
      </EuiButtonEmpty>
    );

    const items = PER_PAGE_INCREMENTS.map(increment => {
      return (
        <EuiContextMenuItem
          key={increment}
          icon="empty"
          onClick={() => this.onChangePerPage(increment)}
        >
          {increment}
        </EuiContextMenuItem>
      );
    });

    const indices = this.getIndicesToShowInList();
    const pageCount = Math.ceil(indices.length / perPage);

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="customizablePagination"
            button={button}
            isOpen={isPerPageControlOpen}
            closePopover={this.closePerPageControl}
            panelPaddingSize="none"
            withTitle
          >
            <EuiContextMenuPanel
              items={items}
            />
          </EuiPopover>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPagination
            pageCount={pageCount}
            activePage={page}
            onPageClick={this.onChangePage}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderStepOneList() {
    const { isLoadingIndices } = this.state;
    if (isLoadingIndices) {
      return null;
    }

    const indices = this.getIndicesToShowInList();
    const paginatedIndices = this.getPaginatedIndices(indices);
    const rows = paginatedIndices.map((index, key) => {
      return (
        <EuiTableRow key={key}>
          <EuiTableRowCell>
            {index.name}
          </EuiTableRowCell>
        </EuiTableRow>
      );
    });

    return (
      <EuiTable>
        <EuiTableBody>
          {rows}
        </EuiTableBody>
      </EuiTable>
    );
  }

  render() {
    return (
      <div>
        {this.renderHeader()}
        {this.renderInitialLoadingState()}
        {this.renderInitialEmptyState()}
        {this.renderStepOne()}
      </div>
    );
  }
}

export const renderReact = (es) => {
  render(
    <CreateIndexPatternWizard
      loadingDataDocUrl={documentationLinks.indexPatterns.loadingData}
      services={{
        es,
      }}
    />,
    document.getElementById('react')
  );
};
