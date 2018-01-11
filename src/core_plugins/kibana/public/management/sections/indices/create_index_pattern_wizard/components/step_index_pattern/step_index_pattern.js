import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ILLEGAL_CHARACTERS } from '../../constants';
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
      isLoadingIndices: false,
      query: props.initialQuery,
      appendedWildcard: false,
      showingIndexPatternQueryErrors: false,
    };
  }

  fetchIndices = async (query) => {
    const { esService } = this.props;

    this.setState({ isLoadingIndices: true });
    const partialMatchedIndices = await getIndices(esService, `${query}*`);
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

  renderStatusMessage() {
    const { allIndices, isIncludingSystemIndices } = this.props;
    const { query, isLoadingIndices, partialMatchedIndices } = this.state;

    if (isLoadingIndices) {
      return null;
    }

    const matchedIndices = getMatchedIndices(allIndices, partialMatchedIndices, query, isIncludingSystemIndices);

    return (
      <StatusMessage
        matchedIndices={matchedIndices}
        query={query}
      />
    );
  }

  renderList() {
    const { isIncludingSystemIndices, allIndices } = this.props;
    const {
      query,
      partialMatchedIndices,
      isLoadingIndices,
    } = this.state;

    if (isLoadingIndices) {
      return null;
    }

    const indices = getMatchedIndices(allIndices, partialMatchedIndices, query, isIncludingSystemIndices);

    const indicesToList = query.length
      ? indices.visibleIndices
      : indices.allIndices;

    return (
      <IndicesList
        indices={indicesToList}
      />
    );
  }

  renderHeader() {
    const { isIncludingSystemIndices, allIndices, goToNextStep } = this.props;
    const {
      query,
      showingIndexPatternQueryErrors,
      partialMatchedIndices,
    } = this.state;

    const {
      exactMatchedIndices: indices
    } = getMatchedIndices(allIndices, partialMatchedIndices, query, isIncludingSystemIndices);

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
    return (
      <EuiPanel paddingSize="l">
        {this.renderHeader()}
        <EuiSpacer size="s"/>
        {this.renderLoadingState()}
        {this.renderStatusMessage()}
        <EuiSpacer size="s"/>
        {this.renderList()}
      </EuiPanel>
    );
  }
}
