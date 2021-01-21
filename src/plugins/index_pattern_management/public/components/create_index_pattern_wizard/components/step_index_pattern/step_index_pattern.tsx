/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component } from 'react';
import { EuiSpacer, EuiCallOut, EuiSwitchEvent } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { indexPatterns, IndexPatternAttributes } from '../../../../../../../plugins/data/public';
import { getIndices, getMatchedIndices, canAppendWildcard, ensureMinimumTime } from '../../lib';
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
  titleError: boolean;
  indexPatternName: string;
  isIncludingSystemIndices: boolean;
  isLoadingIndices: boolean;
  partialMatchedIndices: MatchedItem[];
  selectedPatterns: string[];
  patternError: boolean;
  title: string;
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
    titleError: false,
    indexPatternName: '',
    isIncludingSystemIndices: false,
    isLoadingIndices: false,
    partialMatchedIndices: [],
    selectedPatterns: [],
    patternError: false,
    title: '',
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

    this.setState({ ...this.state, existingIndexPatterns });
  };

  fetchIndices = async (wildcardArray: string[]) => {
    const { indexPatternCreationType } = this.props;

    this.setState({ ...this.state, isLoadingIndices: true, titleError: false });
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

    // If the search changed, discard this state
    if (JSON.stringify(wildcardArray) !== JSON.stringify(this.lastQuery)) {
      return;
    }
    console.log('fetchIndices setState', {
      ...this.state,
      partialMatchedIndices,
      exactMatchedIndices,
      isLoadingIndices: false,
    });
    this.setState({
      ...this.state,
      partialMatchedIndices,
      exactMatchedIndices,
      isLoadingIndices: false,
    });
  };

  onTitleChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { existingIndexPatterns } = this.state;
    console.log('onTitleChanged', existingIndexPatterns);
    if ((existingIndexPatterns as string[]).includes(e.target.value)) {
      return this.setState({
        ...this.state,
        title: e.target.value,
        titleError: true,
      });
    }
    this.setState({
      ...this.state,
      title: e.target.value,
    });
  };

  onQueryChanged = (patterns: string[]) => {
    const wildcardArray = patterns.map((pat) => {
      let q = pat;
      if (q.length === 1 && canAppendWildcard(q)) {
        q += '*';
      }
      return q;
    });

    this.lastQuery = wildcardArray;
    console.log('onQueryChanged setState', {
      ...this.state,
      selectedPatterns: wildcardArray,
      patternError: !wildcardArray.length,
    });
    this.setState({
      ...this.state,
      selectedPatterns: wildcardArray,
      patternError: !wildcardArray.length,
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
    const { titleError, isIncludingSystemIndices, isLoadingIndices, selectedPatterns } = this.state;

    if (isLoadingIndices || titleError) {
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
    const { selectedPatterns, isLoadingIndices, titleError } = this.state;

    if (isLoadingIndices || titleError) {
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
    const { titleError, title } = this.state;

    if (!titleError) {
      return null;
    }

    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.step.warningHeader"
            defaultMessage="There's already an index pattern called {title}"
            values={{ title }}
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
      titleError,
      isIncludingSystemIndices,
      selectedPatterns,
      patternError,
      title,
    } = this.state;
    const characterList = this.ILLEGAL_CHARACTERS.slice(0, this.ILLEGAL_CHARACTERS.length - 1).join(
      ', '
    );
    const checkIndices = indexPatternCreationType.checkIndicesForErrors(indices);

    const isNextStepDisabled =
      indices.length === 0 || patternError || titleError || title.length === 0;
    console.log('renderHeader', {
      titleError,
      patternError,
      isNextStepDisabled,
    });
    return (
      <Header
        characterList={characterList}
        checkIndices={checkIndices}
        data-test-subj="createIndexPatternStep1Header"
        goToNextStep={() => goToNextStep(selectedPatterns, canPreselectTimeField(indices))}
        isIncludingSystemIndices={isIncludingSystemIndices}
        isNextStepDisabled={isNextStepDisabled}
        onChangeIncludingSystemIndices={this.onChangeIncludingSystemIndices}
        onQueryChanged={this.onQueryChanged}
        onTitleChanged={this.onTitleChanged}
        patternError={patternError}
        selectedPatterns={selectedPatterns}
        showSystemIndices={this.props.showSystemIndices}
        title={title}
        titleError={titleError}
      />
    );
  }

  onChangeIncludingSystemIndices = (event: EuiSwitchEvent) => {
    this.setState({ ...this.state, isIncludingSystemIndices: event.target.checked }, () =>
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
