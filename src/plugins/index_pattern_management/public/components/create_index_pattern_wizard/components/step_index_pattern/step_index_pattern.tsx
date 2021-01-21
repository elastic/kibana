/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { indexPatterns } from '../../../../../../data/public';
import { IndexPatternCreationConfig } from '../../../../service/creation';
import { getMatchedIndices } from '../../lib';
import { MatchedItem } from '../../types';
import { Header } from './components/header';
import { IndicesList } from './components/indices_list';
import { LoadingIndices } from './components/loading_indices';
import { StatusMessage } from './components/status_message';
import { useIndexPattern } from './use_index_pattern';
import { canPreselectTimeField } from './utils';

interface StepIndexPatternProps {
  allIndices: MatchedItem[];
  goToNextStep: (selectedPatterns: string[], title: string, timestampField?: string) => void;
  indexPatternCreationType: IndexPatternCreationConfig;
  initialQuery?: string[];
  showSystemIndices: boolean;
}

const ILLEGAL_CHARACTERS = [...indexPatterns.ILLEGAL_CHARACTERS];
const characterList = ILLEGAL_CHARACTERS.slice(0, ILLEGAL_CHARACTERS.length - 1).join(', ');
export const StepIndexPattern = ({
  allIndices,
  indexPatternCreationType,
  goToNextStep,
  initialQuery,
  showSystemIndices,
}: StepIndexPatternProps) => {
  const ip = useIndexPattern(indexPatternCreationType);
  const {
    exactMatchedIndices,
    titleError,
    isIncludingSystemIndices,
    isLoadingIndices,
    partialMatchedIndices,
    selectedPatterns,
    patternError,
    title,
  } = useMemo(() => ip.state, [ip.state]);
  const matchedIndices = useMemo(
    () =>
      getMatchedIndices(
        allIndices,
        partialMatchedIndices,
        exactMatchedIndices,
        isIncludingSystemIndices
      ),
    [allIndices, exactMatchedIndices, isIncludingSystemIndices, partialMatchedIndices]
  );

  useEffect(() => {
    ip.setIndexPatternName(indexPatternCreationType.getIndexPatternName());
    if (initialQuery) {
      ip.onQueryChanged(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderLoadingState = useMemo(() => {
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
  }, [isLoadingIndices]);
  const renderStatusMessage = useMemo(
    () =>
      isLoadingIndices || titleError ? null : (
        <StatusMessage
          matchedIndices={matchedIndices}
          showSystemIndices={indexPatternCreationType.getShowSystemIndices()}
          isIncludingSystemIndices={isIncludingSystemIndices}
          query={selectedPatterns}
        />
      ),
    [
      indexPatternCreationType,
      titleError,
      isIncludingSystemIndices,
      isLoadingIndices,
      matchedIndices,
      selectedPatterns,
    ]
  );
  const renderList = useMemo(() => {
    if (isLoadingIndices || titleError) {
      return null;
    }

    const indicesToList = selectedPatterns.length
      ? matchedIndices.visibleIndices
      : matchedIndices.allIndices;
    return (
      <IndicesList
        data-test-subj="createIndexPatternStep1IndicesList"
        query={selectedPatterns}
        indices={indicesToList}
      />
    );
  }, [matchedIndices, selectedPatterns, isLoadingIndices, titleError]);
  const renderIndexPatternExists = useMemo(() => {
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
  }, [title, titleError]);
  const renderHeader = useMemo(() => {
    const indices = matchedIndices.exactMatchedIndices;
    const checkIndices = indexPatternCreationType.checkIndicesForErrors(indices);

    const isNextStepDisabled =
      indices.length === 0 || patternError || titleError || title.length === 0;
    return (
      <Header
        characterList={characterList}
        checkIndices={checkIndices}
        data-test-subj="createIndexPatternStep1Header"
        goToNextStep={() => goToNextStep(selectedPatterns, title, canPreselectTimeField(indices))}
        isIncludingSystemIndices={isIncludingSystemIndices}
        isNextStepDisabled={isNextStepDisabled}
        onChangeIncludingSystemIndices={ip.onChangeIncludingSystemIndices}
        onQueryChanged={ip.onQueryChanged}
        onTitleChanged={ip.onTitleChanged}
        patternError={patternError}
        selectedPatterns={selectedPatterns}
        showSystemIndices={showSystemIndices}
        title={title}
        titleError={titleError}
      />
    );
  }, [
    goToNextStep,
    indexPatternCreationType,
    ip.onChangeIncludingSystemIndices,
    ip.onQueryChanged,
    ip.onTitleChanged,
    isIncludingSystemIndices,
    matchedIndices.exactMatchedIndices,
    patternError,
    selectedPatterns,
    showSystemIndices,
    title,
    titleError,
  ]);

  return (
    <>
      {renderHeader}
      <EuiSpacer />
      {renderLoadingState}
      {renderIndexPatternExists}
      {renderStatusMessage}
      <EuiSpacer />
      {renderList}
    </>
  );
};
