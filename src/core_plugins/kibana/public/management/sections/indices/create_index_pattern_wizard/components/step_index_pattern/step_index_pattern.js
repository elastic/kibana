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
} from '@elastic/eui';

export class StepIndexPattern extends Component {
  static propTypes = {
    allIndices: PropTypes.array.isRequired,
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
      partialMatchedIndices: [],
      exactMatchedIndices: [],
      isLoadingIndices: false,
      query: props.initialQuery,
      appendedWildcard: false,
      showingIndexPatternQueryErrors: false,
    };

    this.lastQuery = null;
  }

  async componentWillMount() {
    if (this.state.query) {
      this.lastQuery = this.state.query;
      this.fetchIndices(this.state.query);
    }
  }

  fetchIndices = async (query) => {
    const { esService } = this.props;

    this.setState({ isLoadingIndices: true, indexPatternExists: false });
    if (query.endsWith('*')) {
      const exactMatchedIndices = await getIndices(esService, query, MAX_SEARCH_SIZE);
      createReasonableWait(() => {
        // If the search changed, discard this state
        if (query !== this.lastQuery) {
          return;
        }
        this.setState({ exactMatchedIndices, isLoadingIndices: false });
      });
    }
    else {
      const partialMatchedIndices = await getIndices(esService, `${query}*`, MAX_SEARCH_SIZE);
      const exactMatchedIndices = await getIndices(esService, query, MAX_SEARCH_SIZE);
      createReasonableWait(() => {
        // If the search changed, discard this state
        if (query !== this.lastQuery) {
          return;
        }

        this.setState({
          partialMatchedIndices,
          exactMatchedIndices,
          isLoadingIndices: false
        });
      });
    }
  }

  onQueryChanged = e => {
    const { appendedWildcard } = this.state;
    const { target } = e;

    let query = target.value;
    if (query.length === 1 && canAppendWildcard(query)) {
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

    this.lastQuery = query;
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
    const { query, isLoadingIndices } = this.state;

    if (isLoadingIndices) {
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
    const { query, isLoadingIndices } = this.state;

    if (isLoadingIndices) {
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

  renderHeader({ exactMatchedIndices: indices }) {
    const { goToNextStep } = this.props;
    const { query, showingIndexPatternQueryErrors } = this.state;

    let containsErrors = false;
    const errors = [];
    const characterList = ILLEGAL_CHARACTERS.slice(0, ILLEGAL_CHARACTERS.length - 1).join(', ');

    if (!isIndexPatternQueryValid(query, ILLEGAL_CHARACTERS)) {
      errors.push(`Your input contains invalid characters or spaces. Please omit: ${characterList}`);
      containsErrors = true;
    }

    const isInputInvalid = showingIndexPatternQueryErrors && containsErrors;
    const isNextStepDisabled = containsErrors || indices.length === 0;

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
    const { query, partialMatchedIndices, exactMatchedIndices } = this.state;

    const matchedIndices = getMatchedIndices(
      allIndices,
      partialMatchedIndices,
      exactMatchedIndices,
      query,
      isIncludingSystemIndices
    );

    return (
      <EuiPanel paddingSize="l">
        {this.renderHeader(matchedIndices)}
        <EuiSpacer size="s"/>
        {this.renderLoadingState(matchedIndices)}
        {this.renderStatusMessage(matchedIndices)}
        <EuiSpacer size="s"/>
        {this.renderList(matchedIndices)}
      </EuiPanel>
    );
  }
}
