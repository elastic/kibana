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
import { EuiSpacer, EuiCallOut, EuiSwitchEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  indexPatterns,
  IndexPatternAttributes,
  UI_SETTINGS,
} from '../../../../../../../plugins/data/public';
import {
  getIndices,
  containsIllegalCharacters,
  getMatchedIndices,
  canAppendWildcard,
  ensureMinimumTime,
} from '../../lib';
import { LoadingIndices } from './components/loading_indices';
import { StatusMessage } from './components/status_message';
import { IndicesList } from './components/indices_list';
import { Header } from './components/header';
import { context as contextType } from '../../../../../../kibana_react/public';
import { IndexPatternCreationConfig } from '../../../../../../../plugins/index_pattern_management/public';
import { MatchedItem } from '../../types';
import { IndexPatternManagmentContextValue } from '../../../../types';

interface StepIndexPatternProps {
  allIndices: MatchedItem[];
  indexPatternCreationType: IndexPatternCreationConfig;
  goToNextStep: (query: string, timestampField?: string) => void;
  initialQuery?: string;
  showSystemIndices: boolean;
}

interface StepIndexPatternState {
  partialMatchedIndices: MatchedItem[];
  exactMatchedIndices: MatchedItem[];
  isLoadingIndices: boolean;
  existingIndexPatterns: string[];
  indexPatternExists: boolean;
  query: string;
  appendedWildcard: boolean;
  showingIndexPatternQueryErrors: boolean;
  indexPatternName: string;
  isIncludingSystemIndices: boolean;
}

export const canPreselectTimeField = (indices: MatchedItem[]) => {
  const preselectStatus = indices.reduce(
    (
      { canPreselect, timeFieldName }: { canPreselect: boolean; timeFieldName?: string },
      matchedItem
    ) => {
      const dataStreamItem = matchedItem.item;
      const dataStreamTimestampField = dataStreamItem.timestamp_field;
      const isDataStream = !!dataStreamItem.timestamp_field;
      const timestampFieldMatches =
        timeFieldName === undefined || timeFieldName === dataStreamTimestampField;

      return {
        canPreselect: canPreselect && isDataStream && timestampFieldMatches,
        timeFieldName: dataStreamTimestampField || timeFieldName,
      };
    },
    {
      canPreselect: true,
      timeFieldName: undefined,
    }
  );

  return preselectStatus.canPreselect ? preselectStatus.timeFieldName : undefined;
};

export class StepIndexPattern extends Component<StepIndexPatternProps, StepIndexPatternState> {
  static contextType = contextType;

  public readonly context!: IndexPatternManagmentContextValue;

  state = {
    partialMatchedIndices: [],
    exactMatchedIndices: [],
    isLoadingIndices: false,
    existingIndexPatterns: [],
    indexPatternExists: false,
    query: '',
    appendedWildcard: false,
    showingIndexPatternQueryErrors: false,
    indexPatternName: '',
    isIncludingSystemIndices: false,
  };
  ILLEGAL_CHARACTERS = [...indexPatterns.ILLEGAL_CHARACTERS];

  constructor(props: StepIndexPatternProps, context: IndexPatternManagmentContextValue) {
    super(props, context);
    const { indexPatternCreationType, initialQuery } = this.props;

    this.state.query =
      initialQuery || context.services.uiSettings.get(UI_SETTINGS.INDEXPATTERN_PLACEHOLDER);
    this.state.indexPatternName = indexPatternCreationType.getIndexPatternName();
  }

  lastQuery = '';

  async UNSAFE_componentWillMount() {
    this.fetchExistingIndexPatterns();
    if (this.state.query) {
      this.lastQuery = this.state.query;
      this.fetchIndices(this.state.query);
    }
  }

  fetchExistingIndexPatterns = async () => {
    const { savedObjects } = await this.context.services.savedObjects.client.find<
      IndexPatternAttributes
    >({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000,
    });

    const existingIndexPatterns = savedObjects.map((obj) =>
      obj && obj.attributes ? obj.attributes.title : ''
    ) as string[];

    this.setState({ existingIndexPatterns });
  };

  fetchIndices = async (query: string) => {
    const { indexPatternCreationType } = this.props;
    const { existingIndexPatterns } = this.state;

    if ((existingIndexPatterns as string[]).includes(query)) {
      this.setState({ indexPatternExists: true });
      return;
    }

    this.setState({ isLoadingIndices: true, indexPatternExists: false });

    if (query.endsWith('*')) {
      const exactMatchedIndices = await ensureMinimumTime(
        getIndices(
          this.context.services.http,
          indexPatternCreationType,
          query,
          this.state.isIncludingSystemIndices
        )
      );
      // If the search changed, discard this state
      if (query !== this.lastQuery) {
        return;
      }
      this.setState({ exactMatchedIndices, isLoadingIndices: false });
      return;
    }

    const [partialMatchedIndices, exactMatchedIndices] = await ensureMinimumTime([
      getIndices(
        this.context.services.http,
        indexPatternCreationType,
        `${query}*`,
        this.state.isIncludingSystemIndices
      ),
      getIndices(
        this.context.services.http,
        indexPatternCreationType,
        query,
        this.state.isIncludingSystemIndices
      ),
    ]);

    // If the search changed, discard this state
    if (query !== this.lastQuery) {
      return;
    }

    this.setState({
      partialMatchedIndices,
      exactMatchedIndices,
      isLoadingIndices: false,
    });
  };

  onQueryChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  renderLoadingState() {
    const { isLoadingIndices } = this.state;

    if (!isLoadingIndices) {
      return null;
    }

    return <LoadingIndices data-test-subj="createIndexPatternStep1Loading" />;
  }

  renderStatusMessage(matchedIndices: {
    allIndices: MatchedItem[];
    exactMatchedIndices: MatchedItem[];
    partialMatchedIndices: MatchedItem[];
  }) {
    const { indexPatternCreationType } = this.props;
    const { query, isLoadingIndices, indexPatternExists, isIncludingSystemIndices } = this.state;

    if (isLoadingIndices || indexPatternExists) {
      return null;
    }

    return (
      <StatusMessage
        matchedIndices={matchedIndices}
        showSystemIndices={indexPatternCreationType.getShowSystemIndices()}
        isIncludingSystemIndices={isIncludingSystemIndices}
        query={query}
      />
    );
  }

  renderList({
    visibleIndices,
    allIndices,
  }: {
    visibleIndices: MatchedItem[];
    allIndices: MatchedItem[];
  }) {
    const { query, isLoadingIndices, indexPatternExists } = this.state;

    if (isLoadingIndices || indexPatternExists) {
      return null;
    }

    const indicesToList = query.length ? visibleIndices : allIndices;
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
        title={
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.step.warningHeader"
            defaultMessage="There's already an index pattern called {query}"
            values={{ query }}
          />
        }
        iconType="help"
        color="warning"
      />
    );
  }

  renderHeader({ exactMatchedIndices: indices }: { exactMatchedIndices: MatchedItem[] }) {
    const { goToNextStep, indexPatternCreationType } = this.props;
    const {
      query,
      showingIndexPatternQueryErrors,
      indexPatternExists,
      indexPatternName,
      isIncludingSystemIndices,
    } = this.state;

    let containsErrors = false;
    const errors = [];
    const characterList = this.ILLEGAL_CHARACTERS.slice(0, this.ILLEGAL_CHARACTERS.length - 1).join(
      ', '
    );

    const checkIndices = indexPatternCreationType.checkIndicesForErrors(indices);

    if (!query || !query.length || query === '.' || query === '..') {
      // This is an error scenario but do not report an error
      containsErrors = true;
    } else if (containsIllegalCharacters(query, indexPatterns.ILLEGAL_CHARACTERS)) {
      const errorMessage = i18n.translate(
        'indexPatternManagement.createIndexPattern.step.invalidCharactersErrorMessage',
        {
          defaultMessage:
            'A {indexPatternName} cannot contain spaces or the characters: {characterList}',
          values: { characterList, indexPatternName },
        }
      );

      errors.push(errorMessage);
      containsErrors = true;
    } else if (checkIndices) {
      errors.push(...(checkIndices as string[]));
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
        goToNextStep={() => goToNextStep(query, canPreselectTimeField(indices))}
        isNextStepDisabled={isNextStepDisabled}
        onChangeIncludingSystemIndices={this.onChangeIncludingSystemIndices}
        isIncludingSystemIndices={isIncludingSystemIndices}
        showSystemIndices={this.props.showSystemIndices}
      />
    );
  }

  onChangeIncludingSystemIndices = (event: EuiSwitchEvent) => {
    this.setState({ isIncludingSystemIndices: event.target.checked }, () =>
      this.fetchIndices(this.state.query)
    );
  };

  render() {
    const { allIndices } = this.props;
    const { partialMatchedIndices, exactMatchedIndices, isIncludingSystemIndices } = this.state;

    const matchedIndices = getMatchedIndices(
      allIndices,
      partialMatchedIndices,
      exactMatchedIndices,
      isIncludingSystemIndices
    );

    return (
      <>
        {this.renderHeader(matchedIndices)}
        <EuiSpacer />
        {this.renderLoadingState()}
        {this.renderIndexPatternExists()}
        {this.renderStatusMessage(matchedIndices)}
        <EuiSpacer />
        {this.renderList(matchedIndices)}
      </>
    );
  }
}
