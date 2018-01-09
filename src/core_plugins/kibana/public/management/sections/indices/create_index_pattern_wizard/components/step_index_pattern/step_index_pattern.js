import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ILLEGAL_CHARACTERS } from '../../constants';
import { getIndices } from '../../lib/get_indices';
import { isIndexPatternQueryValid } from '../../lib/is_index_pattern_query_valid';
import { getWhitelistedIndices } from '../../lib/get_whitelisted_indices';
import { LoadingIndices } from './components/loading_indices';
import { StatusMessage } from './components/status_message';
import { IndicesList } from './components/indices_list';

import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';
import { canAppendWildcard } from '../../lib/can_append_wildcard';
import { createReasonableWait } from '../../lib/create_reasonable_wait';

export class StepIndexPattern extends Component {
  static propTypes = {
    initialIndices: PropTypes.array.isRequired,
    isIncludingSystemIndices: PropTypes.bool.isRequired,
    esService: PropTypes.object.isRequired,
    goToNextStep: PropTypes.func.isRequired,
    initialQuery: PropTypes.string,
  }

  static defaultProps = {
    initialQuery: '',
  }

  constructor(props) {
    super(props);
    this.state = {
      matchingIndices: [],
      isLoadingIndices: false,
      query: props.initialQuery,
      appendedWildcard: false,
      showingIndexPatternQueryErrors: false,
    };
  }

  fetchIndices = async (query) => {
    const { esService } = this.props;

    this.setState({ isLoadingIndices: true });
    const matchingIndices = await getIndices(esService, `${query}*`);
    createReasonableWait(() => this.setState({ matchingIndices, isLoadingIndices: false }));
  }

  onQueryChanged = (e) => {
    const { appendedWildcard } = this.state;
    const { target } = e;

    let query = target.value;
    if (query.length === 1 && canAppendWildcard(e.nativeEvent)) {
      query += '*';
      this.setState({ appendedWildcard: true });
      setTimeout(() => target.setSelectionRange(1, 1));
    }
    else {
      if (query === '*' && appendedWildcard) {
        query = '';
        this.setState({ appendedWildcard: false });
      }
    }

    this.setState({ query, showingIndexPatternQueryErrors: !!query.length });
    this.fetchIndices(query);
  }

  renderLoadingState() {
    const { isLoadingIndices } = this.state;

    if (isLoadingIndices) {
      return (
        <LoadingIndices/>
      );
    }

    return null;
  }

  renderStatusMessage() {
    const { initialIndices, isIncludingSystemIndices } = this.props;
    const { query, isLoadingIndices, matchingIndices } = this.state;

    if (isLoadingIndices) {
      return null;
    }

    return (
      <StatusMessage
        initialIndices={initialIndices}
        matchingIndices={matchingIndices}
        query={query}
        isIncludingSystemIndices={isIncludingSystemIndices}
      />
    );
  }

  renderList() {
    const { isIncludingSystemIndices, initialIndices } = this.props;
    const {
      query,
      matchingIndices,
      isLoadingIndices,
    } = this.state;

    if (isLoadingIndices) {
      return null;
    }

    const indices = getWhitelistedIndices(initialIndices, isIncludingSystemIndices, query, matchingIndices);
    const indicesToList = query.length
      ? indices.visibleIndices
      : indices.initialIndices;

    return (
      <IndicesList
        indices={indicesToList}
      />
    );
  }

  render() {
    const { isIncludingSystemIndices, initialIndices, goToNextStep } = this.props;
    const {
      query,
      showingIndexPatternQueryErrors,
      matchingIndices,
    } = this.state;

    const {
      exactMatchingIndices: indices
    } = getWhitelistedIndices(initialIndices, isIncludingSystemIndices, query, matchingIndices);

    let containsErrors = false;
    const errors = [];
    const characterList = ILLEGAL_CHARACTERS.slice(0, ILLEGAL_CHARACTERS.length - 1).join(', ');

    if (!isIndexPatternQueryValid(query, ILLEGAL_CHARACTERS)) {
      errors.push(`Your input contains invalid characters or spaces. Please omit: ${characterList}`);
      containsErrors = true;
    }

    return (
      <EuiPanel paddingSize="l">
        <EuiTitle size="s">
          <h2>
            Step 1 of 2: Define index pattern
          </h2>
        </EuiTitle>
        <EuiSpacer size="m"/>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiForm
              isInvalid={showingIndexPatternQueryErrors && containsErrors}
            >
              <EuiFormRow
                label="Index pattern"
                isInvalid={showingIndexPatternQueryErrors && containsErrors}
                error={errors}
                helpText={
                  <div>
                    <p>You can use a <strong>*</strong> as a wildcard in your index pattern.</p>
                    <p>You can&apos;t use empty spaces or the characters <strong>{characterList}</strong>.</p>
                  </div>
                }
              >
                <EuiFieldText
                  name="indexPattern"
                  placeholder="index-name-*"
                  value={query}
                  isInvalid={showingIndexPatternQueryErrors && containsErrors}
                  onChange={this.onQueryChanged}
                  data-test-subj="createIndexPatternNameInput"
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="arrowRight"
              onClick={() => goToNextStep(query)}
              isDisabled={containsErrors || indices.length === 0}
              data-test-subj="createIndexPatternGoToStep2Button"
            >
              Next step
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s"/>
        {this.renderLoadingState()}
        {this.renderStatusMessage()}
        <EuiSpacer size="s"/>
        {this.renderList()}
      </EuiPanel>
    );
  }
}
