/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component } from 'react';
import { EuiSpacer, EuiCallOut, EuiSwitchEvent, EuiComboBoxOptionOption } from '@elastic/eui';
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
  goToNextStep: (selectedPatterns: string[], timestampField?: string) => void;
  initialQuery?: string;
  showSystemIndices: boolean;
}

interface StepIndexPatternState {
  appendedWildcard: boolean;
  exactMatchedIndices: MatchedItem[];
  existingIndexPatterns: string[];
  indexPatternExists: boolean;
  indexPatternName: string;
  isIncludingSystemIndices: boolean;
  isLoadingIndices: boolean;
  partialMatchedIndices: MatchedItem[];
  selectedPatterns: string[];
  showingIndexPatternQueryErrors: boolean;
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
const combineIndices = (a: MatchedItem[], b: MatchedItem[]): MatchedItem[] => {
  const newIndices = b.filter((idx) => a.every((idxOg) => idxOg.name !== idx.name));
  return [...a, ...newIndices];
};

export class StepIndexPattern extends Component<StepIndexPatternProps, StepIndexPatternState> {
  static contextType = contextType;

  public readonly context!: IndexPatternManagmentContextValue;

  state = {
    appendedWildcard: false,
    exactMatchedIndices: [],
    existingIndexPatterns: [],
    indexPatternExists: false,
    indexPatternName: '',
    isIncludingSystemIndices: false,
    isLoadingIndices: false,
    partialMatchedIndices: [],
    selectedPatterns: [],
    showingIndexPatternQueryErrors: false,
  };

  ILLEGAL_CHARACTERS = [...indexPatterns.ILLEGAL_CHARACTERS];

  constructor(props: StepIndexPatternProps, context: IndexPatternManagmentContextValue) {
    super(props, context);
    const {
      indexPatternCreationType,
      // initialQuery
    } = this.props;

    // this.state.query =
    //   initialQuery || context.services.uiSettings.get(UI_SETTINGS.INDEXPATTERN_PLACEHOLDER);
    this.state.indexPatternName = indexPatternCreationType.getIndexPatternName();
  }

  lastQuery: string[] = [];

  async UNSAFE_componentWillMount() {
    this.fetchExistingIndexPatterns();
    if (this.state.selectedPatterns) {
      this.lastQuery = this.state.selectedPatterns;
      this.fetchIndices(this.state.selectedPatterns);
    }
  }

  fetchExistingIndexPatterns = async () => {
    const {
      savedObjects,
    } = await this.context.services.savedObjects.client.find<IndexPatternAttributes>({
      type: 'index-pattern',
      fields: ['title'],
      perPage: 10000,
    });

    const existingIndexPatterns = savedObjects.map((obj) =>
      obj && obj.attributes ? obj.attributes.title : ''
    ) as string[];

    this.setState({ existingIndexPatterns });
  };

  fetchIndices = async (wildcardArray: string[]) => {
    const { indexPatternCreationType } = this.props;
    // const { existingIndexPatterns } = this.state;
    // if ((existingIndexPatterns as string[]).includes(query)) {
    //   this.setState({ indexPatternExists: true });
    //   return;
    // }

    this.setState({ isLoadingIndices: true, indexPatternExists: false });
    let exactMatchedIndices: MatchedItem[] = [];
    let partialMatchedIndices: MatchedItem[] = [];
    await Promise.all(
      wildcardArray.map(async (query) => {
        if (query.endsWith('*')) {
          const exactMatchedIndices2 = await ensureMinimumTime(
            getIndices(
              this.context.services.http,
              (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
              query,
              this.state.isIncludingSystemIndices
            )
          );
          exactMatchedIndices = combineIndices(exactMatchedIndices, exactMatchedIndices2);
        } else {
          const [partialMatchedIndices2, exactMatchedIndices2] = await ensureMinimumTime([
            getIndices(
              this.context.services.http,
              (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
              `${query}*`,
              this.state.isIncludingSystemIndices
            ),
            getIndices(
              this.context.services.http,
              (indexName: string) => indexPatternCreationType.getIndexTags(indexName),
              query,
              this.state.isIncludingSystemIndices
            ),
          ]);
          exactMatchedIndices = combineIndices(exactMatchedIndices, exactMatchedIndices2);
          partialMatchedIndices = combineIndices(partialMatchedIndices, partialMatchedIndices2);
        }
      })
    );
    console.log('fetchIndices', {
      partialMatchedIndices,
      exactMatchedIndices,
    });

    // If the search changed, discard this state
    if (JSON.stringify(wildcardArray) !== JSON.stringify(this.lastQuery)) {
      return;
    }
    this.setState({
      partialMatchedIndices,
      exactMatchedIndices,
      isLoadingIndices: false,
    });
  };

  onQueryChanged = (patterns: string[]) => {
    // const { appendedWildcard } = this.state;
    // const { target } = e;
    const wildcardArray = patterns.map((pat) => {
      let q = pat;
      if (q.length === 1 && canAppendWildcard(q)) {
        q += '*';
      }
      return q;
    });
    // let query = patterns[0];
    // if (query.length === 1 && canAppendWildcard(query)) {
    //   query += '*';
    //   this.setState({ appendedWildcard: true });
    //   // setTimeout(() => target.setSelectionRange(1, 1));
    // } else {
    //   if (query === '*' && appendedWildcard) {
    //     query = '';
    //     this.setState({ appendedWildcard: false });
    //   }
    // }

    this.lastQuery = wildcardArray;
    this.setState({
      selectedPatterns: wildcardArray,
      showingIndexPatternQueryErrors: !!wildcardArray.length,
    });
    this.fetchIndices(wildcardArray);
  };

  renderLoadingState() {
    const { isLoadingIndices } = this.state;

    if (!isLoadingIndices) {
      return null;
    }

    return (
      <>
        <EuiSpacer />
        <LoadingIndices data-test-subj="createIndexPatternStep1Loading" />
        <EuiSpacer />
      </>
    );
  }

  renderStatusMessage(matchedIndices: {
    allIndices: MatchedItem[];
    exactMatchedIndices: MatchedItem[];
    partialMatchedIndices: MatchedItem[];
  }) {
    const { indexPatternCreationType } = this.props;
    const {
      indexPatternExists,
      isIncludingSystemIndices,
      isLoadingIndices,
      selectedPatterns,
    } = this.state;

    if (isLoadingIndices || indexPatternExists) {
      return null;
    }

    return (
      <StatusMessage
        matchedIndices={matchedIndices}
        showSystemIndices={indexPatternCreationType.getShowSystemIndices()}
        isIncludingSystemIndices={isIncludingSystemIndices}
        query={selectedPatterns}
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
    const { selectedPatterns, isLoadingIndices, indexPatternExists } = this.state;

    if (isLoadingIndices || indexPatternExists) {
      return null;
    }

    const indicesToList = selectedPatterns.length ? visibleIndices : allIndices;
    return (
      <IndicesList
        data-test-subj="createIndexPatternStep1IndicesList"
        query={selectedPatterns}
        indices={indicesToList}
      />
    );
  }

  renderIndexPatternExists() {
    const { indexPatternExists } = this.state;

    if (!indexPatternExists) {
      return null;
    }

    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.step.warningHeader"
            defaultMessage="There's already an index pattern that matches these patterns exactly"
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
      indexPatternExists,
      indexPatternName,
      isIncludingSystemIndices,
      selectedPatterns,
      showingIndexPatternQueryErrors,
    } = this.state;

    const containsErrors = false;
    const errors: string[] = [];
    const characterList = this.ILLEGAL_CHARACTERS.slice(0, this.ILLEGAL_CHARACTERS.length - 1).join(
      ', '
    );

    const checkIndices = indexPatternCreationType.checkIndicesForErrors(indices);

    // if (!query || !query.length || query === '.' || query === '..') {
    //   // This is an error scenario but do not report an error
    //   containsErrors = true;
    // } else if (containsIllegalCharacters(query, indexPatterns.ILLEGAL_CHARACTERS)) {
    //   const errorMessage = i18n.translate(
    //     'indexPatternManagement.createIndexPattern.step.invalidCharactersErrorMessage',
    //     {
    //       defaultMessage:
    //         'A {indexPatternName} cannot contain spaces or the characters: {characterList}',
    //       values: { characterList, indexPatternName },
    //     }
    //   );
    //
    //   errors.push(errorMessage);
    //   containsErrors = true;
    // } else if (checkIndices) {
    //   errors.push(...(checkIndices as string[]));
    //   containsErrors = true;
    // }

    const isInputInvalid = showingIndexPatternQueryErrors && containsErrors && errors.length > 0;
    const isNextStepDisabled = containsErrors || indices.length === 0 || indexPatternExists;

    return (
      <Header
        characterList={characterList}
        data-test-subj="createIndexPatternStep1Header"
        errors={errors}
        goToNextStep={() => goToNextStep(selectedPatterns, canPreselectTimeField(indices))}
        isIncludingSystemIndices={isIncludingSystemIndices}
        isInputInvalid={isInputInvalid}
        isNextStepDisabled={isNextStepDisabled}
        onChangeIncludingSystemIndices={this.onChangeIncludingSystemIndices}
        onQueryChanged={this.onQueryChanged}
        selectedPatterns={selectedPatterns}
        showSystemIndices={this.props.showSystemIndices}
      />
    );
  }

  onChangeIncludingSystemIndices = (event: EuiSwitchEvent) => {
    this.setState({ isIncludingSystemIndices: event.target.checked }, () =>
      this.fetchIndices(this.state.selectedPatterns)
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
    console.log('matchedIndices', matchedIndices);

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
