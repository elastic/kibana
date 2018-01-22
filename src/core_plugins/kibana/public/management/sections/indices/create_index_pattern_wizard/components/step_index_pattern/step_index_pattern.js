import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ILLEGAL_CHARACTERS, MAX_SEARCH_SIZE } from '../../constants';
import {
  getIndices,
  isIndexPatternQueryValid,
  getMatchedIndices,
  canAppendWildcard,
  createReasonableWait
} from '../../lib';
import { LoadingIndices } from './components/loading_indices';
import { StatusMessage } from './components/status_message';
import { IndicesList } from './components/indices_list';
import { Header } from './components/header';

import {
  EuiPanel,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';

export class StepIndexPattern extends Component {
  static propTypes = {
    allIndices: PropTypes.array.isRequired,
    isIncludingSystemIndices: PropTypes.bool.isRequired,
    esService: PropTypes.object.isRequired,
    savedObjectsClient: PropTypes.object.isRequired,
    goToNextStep: PropTypes.func.isRequired,
    initialQuery: PropTypes.string,
  }

  static defaultProps = {
    initialQuery: '',
  }

  constructor(props) {
    super(props);
    this.state = {
      partialMatchedIndices: [],
      isLoadingIndices: false,
      existingIndexPatterns: [],
      indexPatternExists: false,
      query: props.initialQuery,
      appendedWildcard: false,
      showingIndexPatternQueryErrors: false,
    };
  }

  async componentWillMount() {
    this.fetchExistingIndexPatterns();
    if (this.state.query) {
      this.fetchIndices(this.state.query);
    }
  }

  fetchExistingIndexPatterns = async () => {
    const { savedObjects } = await this.props.savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000
    });
    const existingIndexPatterns = savedObjects.map(obj => obj && obj.attributes ? obj.attributes.title : '');
    this.setState({ existingIndexPatterns });
  }

  fetchIndices = async (query) => {
    const { esService } = this.props;
    const { existingIndexPatterns } = this.state;

    if (existingIndexPatterns.includes(query)) {
      this.setState({ indexPatternExists: true });
      return;
    }

    this.setState({ isLoadingIndices: true, indexPatternExists: false });
    const esQuery = query.endsWith('*') ? query : `${query}*`;
    const partialMatchedIndices = await getIndices(esService, esQuery, MAX_SEARCH_SIZE);
    createReasonableWait(() => this.setState({ partialMatchedIndices, isLoadingIndices: false }));
  }

  onQueryChanged = (e) => {
    const { appendedWildcard } = this.state;
    const { target } = e;

    let query = target.value;
    if (query.length === 1 && canAppendWildcard(e.nativeEvent.data)) {
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

    if (!isLoadingIndices) {
      return null;
    }

    return (
      <LoadingIndices/>
    );
  }

  renderStatusMessage(matchedIndices) {
    const { query, isLoadingIndices, indexPatternExists } = this.state;

    if (isLoadingIndices || indexPatternExists) {
      return null;
    }

    return (
      <StatusMessage
        matchedIndices={matchedIndices}
        query={query}
      />
    );
  }

  renderList({ visibleIndices, allIndices }) {
    const { query, isLoadingIndices, indexPatternExists } = this.state;

    if (isLoadingIndices || indexPatternExists) {
      return null;
    }

    const indicesToList = query.length
      ? visibleIndices
      : allIndices;

    return (
      <IndicesList
        indices={indicesToList}
      />
    );
  }

  renderIndexPatternExists() {
    const { indexPatternExists, query } = this.state;

    if (!indexPatternExists) {
      return null;
    }

    return (
      <EuiCallOut
        title="Whoops!"
        iconType="help"
        color="warning"
      >
        <p>There&apos;s already an index pattern called `{query}`</p>
      </EuiCallOut>
    );
  }

  renderHeader({ exactMatchedIndices: indices }) {
    const { goToNextStep } = this.props;
    const { query, showingIndexPatternQueryErrors, indexPatternExists } = this.state;

    let containsErrors = false;
    const errors = [];
    const characterList = ILLEGAL_CHARACTERS.slice(0, ILLEGAL_CHARACTERS.length - 1).join(', ');

    if (!isIndexPatternQueryValid(query, ILLEGAL_CHARACTERS)) {
      errors.push(`Your input contains invalid characters or spaces. Please omit: ${characterList}`);
      containsErrors = true;
    }

    const isInputInvalid = showingIndexPatternQueryErrors && containsErrors;
    const isNextStepDisabled = containsErrors || indices.length === 0 || indexPatternExists;

    return (
      <Header
        isInputInvalid={isInputInvalid}
        errors={errors}
        characterList={characterList}
        query={query}
        onQueryChanged={this.onQueryChanged}
        goToNextStep={goToNextStep}
        isNextStepDisabled={isNextStepDisabled}
      />
    );
  }

  render() {
    const { isIncludingSystemIndices, allIndices } = this.props;
    const { query, partialMatchedIndices } = this.state;

    const matchedIndices = getMatchedIndices(allIndices, partialMatchedIndices, query, isIncludingSystemIndices);

    return (
      <EuiPanel paddingSize="l">
        {this.renderHeader(matchedIndices)}
        <EuiSpacer size="s"/>
        {this.renderLoadingState(matchedIndices)}
        {this.renderIndexPatternExists()}
        {this.renderStatusMessage(matchedIndices)}
        <EuiSpacer size="s"/>
        {this.renderList(matchedIndices)}
      </EuiPanel>
    );
  }
}
