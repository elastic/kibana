/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ILLEGAL_CHARACTERS, MAX_SEARCH_SIZE } from '../../constants';
import {
  getIndices,
  containsInvalidCharacters,
  getMatchedIndices,
  canAppendWildcard,
  ensureMinimumTime
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

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';

const uiSettings = chrome.getUiSettingsClient();

export class StepIndexPatternComponent extends Component {
  static propTypes = {
    allIndices: PropTypes.array.isRequired,
    isIncludingSystemIndices: PropTypes.bool.isRequired,
    esService: PropTypes.object.isRequired,
    savedObjectsClient: PropTypes.object.isRequired,
    goToNextStep: PropTypes.func.isRequired,
    initialQuery: PropTypes.string,
  }

  static defaultProps = {
    initialQuery: uiSettings.get('indexPattern:placeholder'),
  }

  constructor(props) {
    super(props);
    this.state = {
      partialMatchedIndices: [],
      exactMatchedIndices: [],
      isLoadingIndices: false,
      existingIndexPatterns: [],
      indexPatternExists: false,
      query: props.initialQuery,
      appendedWildcard: false,
      showingIndexPatternQueryErrors: false,
    };

    this.lastQuery = null;
  }

  async componentWillMount() {
    this.fetchExistingIndexPatterns();
    if (this.state.query) {
      this.lastQuery = this.state.query;
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

    if (query.endsWith('*')) {
      const exactMatchedIndices = await ensureMinimumTime(getIndices(esService, query, MAX_SEARCH_SIZE));
      // If the search changed, discard this state
      if (query !== this.lastQuery) {
        return;
      }
      this.setState({ exactMatchedIndices, isLoadingIndices: false });
      return;
    }

    const [
      partialMatchedIndices,
      exactMatchedIndices,
    ] = await ensureMinimumTime([
      getIndices(esService, `${query}*`, MAX_SEARCH_SIZE),
      getIndices(esService, query, MAX_SEARCH_SIZE),
    ]);

    // If the search changed, discard this state
    if (query !== this.lastQuery) {
      return;
    }

    this.setState({
      partialMatchedIndices,
      exactMatchedIndices,
      isLoadingIndices: false
    });
  }

  onQueryChanged = e => {
    const { appendedWildcard } = this.state;
    const { target } = e;

    let query = target.value;
    if (query.length === 1 && canAppendWildcard(query)) {
      query += '*';
      this.setState({ appendedWildcard: true });
      setTimeout(() => target.setSelectionRange(1, 1));
    } else {
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
      <LoadingIndices data-test-subj="createIndexPatternStep1Loading" />
    );
  }

  renderStatusMessage(matchedIndices) {
    const { query, isLoadingIndices, indexPatternExists, isIncludingSystemIndices } = this.state;

    if (isLoadingIndices || indexPatternExists) {
      return null;
    }

    return (
      <StatusMessage
        matchedIndices={matchedIndices}
        isIncludingSystemIndices={isIncludingSystemIndices}
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
        data-test-subj="createIndexPatternStep1IndicesList"
        query={query}
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
        title={<FormattedMessage
          id="kbn.management.createIndexPattern.step.warningHeader"
          defaultMessage="Whoops!"
        />}
        iconType="help"
        color="warning"
      >
        <p>
          <FormattedMessage
            id="kbn.management.createIndexPattern.step.warningLabel"
            defaultMessage="There's already an index pattern called `{query}`"
            values={{ query }}
          />
        </p>
      </EuiCallOut>
    );
  }

  renderHeader({ exactMatchedIndices: indices }) {
    const { goToNextStep, intl } = this.props;
    const { query, showingIndexPatternQueryErrors, indexPatternExists } = this.state;

    let containsErrors = false;
    const errors = [];
    const characterList = ILLEGAL_CHARACTERS.slice(0, ILLEGAL_CHARACTERS.length - 1).join(', ');

    if (!query || !query.length || query === '.' || query === '..') {
      // This is an error scenario but do not report an error
      containsErrors = true;
    }
    else if (!containsInvalidCharacters(query, ILLEGAL_CHARACTERS)) {
      const errorMessage = intl.formatMessage(
        {
          id: 'kbn.management.createIndexPattern.step.invalidCharactersErrorMessage',
          defaultMessage: 'An index pattern cannot contain spaces or the characters: {characterList}'
        },
        { characterList });

      errors.push(errorMessage);
      containsErrors = true;
    }

    const isInputInvalid = showingIndexPatternQueryErrors && containsErrors && errors.length > 0;
    const isNextStepDisabled = containsErrors || indices.length === 0 || indexPatternExists;

    return (
      <Header
        data-test-subj="createIndexPatternStep1Header"
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
        {this.renderIndexPatternExists()}
        {this.renderStatusMessage(matchedIndices)}
        <EuiSpacer size="s"/>
        {this.renderList(matchedIndices)}
      </EuiPanel>
    );
  }
}

export const StepIndexPattern = injectI18n(StepIndexPatternComponent);
