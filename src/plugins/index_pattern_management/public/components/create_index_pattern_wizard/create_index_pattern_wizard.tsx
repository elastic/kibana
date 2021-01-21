/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { ReactElement, useCallback, useEffect, useMemo, useReducer } from 'react';

import {
  EuiGlobalToastList,
  EuiGlobalToastListToast,
  EuiPageContent,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { DocLinksStart } from 'src/core/public';
import { StepIndexPattern } from './components/step_index_pattern/step_index_pattern_hook';
import { StepTimeField } from './components/step_time_field';
import { Header } from './components/header';
import { LoadingState } from './components/loading_state';

import { useKibana } from '../../../../kibana_react/public';
import { getCreateBreadcrumbs } from '../breadcrumbs';
import { ensureMinimumTime, getIndices } from './lib';
import { IndexPatternCreationConfig } from '../..';
import { IndexPatternManagmentContextValue } from '../../types';
import { MatchedItem } from './types';
import { DuplicateIndexPatternError, IndexPattern } from '../../../../data/public';

interface CreateIndexPatternWizardState {
  allIndices: MatchedItem[];
  docLinks: DocLinksStart | null;
  patternList: string[];
  indexPatternCreationType: IndexPatternCreationConfig | null;
  isInitiallyLoadingIndices: boolean;
  remoteClustersExist: boolean;
  selectedTimeField?: string;
  step: number;
  title: string;
  toasts: EuiGlobalToastListToast[];
}
type Action =
  | { type: 'GO_TO_IP_STEP' }
  | {
      type: 'GO_TO_TIME_FIELD_STEP';
      payload: { step: number; patternList: string[]; selectedTimeField?: string };
    }
  | { type: 'SET_ALL_INDICES'; payload: MatchedItem[] }
  | { type: 'SET_DOC_LINKS'; payload: DocLinksStart }
  | { type: 'SET_REMOTE_CLUSTERS_EXIST'; payload: boolean }
  | { type: 'SET_IP_CREATION_TYPE'; payload: IndexPatternCreationConfig }
  | { type: 'SET_TOASTS'; payload: EuiGlobalToastListToast[] };

const wizardReducer = (
  state: CreateIndexPatternWizardState,
  action: Action
): CreateIndexPatternWizardState => {
  switch (action.type) {
    case 'GO_TO_TIME_FIELD_STEP':
      return {
        ...state,
        ...action.payload,
      };
    case 'GO_TO_IP_STEP':
      return {
        ...state,
        step: 1,
      };
    case 'SET_ALL_INDICES':
      return {
        ...state,
        allIndices: action.payload,
        isInitiallyLoadingIndices: false,
      };
    case 'SET_REMOTE_CLUSTERS_EXIST':
      return {
        ...state,
        remoteClustersExist: action.payload,
      };
    case 'SET_IP_CREATION_TYPE':
      return {
        ...state,
        indexPatternCreationType: action.payload,
      };
    case 'SET_DOC_LINKS':
      return {
        ...state,
        docLinks: action.payload,
      };
    case 'SET_TOASTS':
      return {
        ...state,
        toasts: action.payload,
      };
    default:
      return state;
  }
};
const initialState = {
  allIndices: [],
  patternList: [],
  indexPatternCreationType: null,
  isInitiallyLoadingIndices: true,
  remoteClustersExist: false,
  step: 1,
  title: '',
  toasts: [],
  docLinks: null,
};
export const CreateIndexPatternWizard = (props: RouteComponentProps) => {
  const {
    services: { data, docLinks, http, indexPatternManagementStart, overlays, setBreadcrumbs },
  }: IndexPatternManagmentContextValue = useKibana();

  const [state, dispatch] = useReducer(wizardReducer, initialState);
  useEffect(() => {
    const type = new URLSearchParams(props.location.search).get('type') || undefined;
    dispatch({
      type: 'SET_IP_CREATION_TYPE',
      payload: indexPatternManagementStart.creation.getType(type),
    });
  }, [indexPatternManagementStart.creation, props.location.search]);
  useEffect(() => {
    if (docLinks) {
      dispatch({ type: 'SET_DOC_LINKS', payload: docLinks });
    }
  }, [docLinks]);
  const catchAndWarn = useCallback(
    async (asyncFn: Promise<MatchedItem[]>, errorValue: [] | string[], errorMsg: ReactElement) => {
      {
        try {
          return await asyncFn;
        } catch (errors) {
          dispatch({
            type: 'SET_TOASTS',
            payload: state.toasts.concat([
              {
                title: errorMsg,
                id: errorMsg.props.id,
                color: 'warning',
                iconType: 'alert',
              },
            ]),
          });
          return errorValue;
        }
      }
    },
    [state.toasts]
  );

  const fetchData = useCallback(async () => {
    console.log('fetchData', { http, indexPatternCreationType: state.indexPatternCreationType });
    if (!http || state.indexPatternCreationType === null) {
      return;
    }
    const indicesFailMsg = (
      <FormattedMessage
        id="indexPatternManagement.createIndexPattern.loadIndicesFailMsg"
        defaultMessage="Failed to load indices"
      />
    );

    const clustersFailMsg = (
      <FormattedMessage
        id="indexPatternManagement.createIndexPattern.loadClustersFailMsg"
        defaultMessage="Failed to load remote clusters"
      />
    );

    const getIndexTags = state.indexPatternCreationType.getIndexTags;

    // query local and remote indices, updating state independently
    const allIndices: MatchedItem[] = await ensureMinimumTime(
      catchAndWarn(
        getIndices(http, (indexName: string) => getIndexTags(indexName), `*`, false),

        [],
        indicesFailMsg
      )
    );
    dispatch({ payload: allIndices, type: 'SET_ALL_INDICES' });

    const remoteIndices: string[] | MatchedItem[] = await catchAndWarn(
      // if we get an error from remote cluster query, supply fallback value that allows user entry.
      // ['a'] is fallback value
      getIndices(http, (indexName: string) => getIndexTags(indexName), `*:*`, false),

      ['a'],
      clustersFailMsg
    );
    dispatch({ type: 'SET_REMOTE_CLUSTERS_EXIST', payload: !!remoteIndices.length });
  }, [catchAndWarn, http, state.indexPatternCreationType]);
  const createIndexPattern = useCallback(
    async (timeFieldName: string | undefined, indexPatternId: string) => {
      let emptyPattern: IndexPattern;
      if (state.indexPatternCreationType === null || !overlays) {
        return;
      }

      try {
        emptyPattern = await data.indexPatterns.createAndSave({
          id: indexPatternId,
          title: state.title,
          patternList: state.patternList,
          timeFieldName,
          ...state.indexPatternCreationType.getIndexPatternMappings(),
        });
      } catch (err) {
        if (err instanceof DuplicateIndexPatternError) {
          const confirmMessage = i18n.translate(
            'indexPatternManagement.indexPattern.titleExistsLabel',
            {
              values: { title: emptyPattern!.title },
              defaultMessage: "An index pattern with the title '{title}' already exists.",
            }
          );

          const isConfirmed = await overlays.openConfirm(confirmMessage, {
            confirmButtonText: i18n.translate(
              'indexPatternManagement.indexPattern.goToPatternButtonLabel',
              {
                defaultMessage: 'Go to existing pattern',
              }
            ),
          });

          if (isConfirmed) {
            return props.history.push(`/patterns/${indexPatternId}`);
          } else {
            return;
          }
        } else {
          throw err;
        }
      }

      await data.indexPatterns.setDefault(emptyPattern.id as string);

      data.indexPatterns.clearCache(emptyPattern.id as string);
      props.history.push(`/patterns/${emptyPattern.id}`);
    },
    [
      data.indexPatterns,
      overlays,
      props.history,
      state.indexPatternCreationType,
      state.patternList,
      state.title,
    ]
  );
  useEffect(() => {
    if (state.indexPatternCreationType != null) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.indexPatternCreationType]);
  useEffect(() => {
    setBreadcrumbs(getCreateBreadcrumbs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const goToTimeFieldStep = useCallback((patternList: string[], selectedTimeField?: string) => {
    dispatch({
      type: 'GO_TO_TIME_FIELD_STEP',
      payload: { step: 2, patternList, selectedTimeField },
    });
  }, []);
  const goToIndexPatternStep = useCallback(() => {
    dispatch({ type: 'GO_TO_IP_STEP' });
  }, []);
  const removeToast = useCallback(
    (id: string) => {
      dispatch({ type: 'SET_TOASTS', payload: state.toasts.filter((toast) => toast.id !== id) });
    },
    [state.toasts]
  );
  const renderHeader = useMemo(() => {
    if (!state.indexPatternCreationType || !state.docLinks) {
      return;
    }
    return (
      <Header
        prompt={state.indexPatternCreationType.renderPrompt()}
        indexPatternName={state.indexPatternCreationType.getIndexPatternName()}
        isBeta={state.indexPatternCreationType.getIsBeta()}
        docLinks={state.docLinks}
      />
    );
  }, [state.docLinks, state.indexPatternCreationType]);
  const renderContent = useMemo(() => {
    // console.log('renderContent!', state);
    if (state.isInitiallyLoadingIndices || !state.indexPatternCreationType) {
      return <LoadingState />;
    }
    if (state.step === 1) {
      const initialQuery = [new URLSearchParams(props.location.search).get('id')] || undefined;

      return (
        <EuiPageContent>
          {renderHeader}
          <EuiHorizontalRule />
          <StepIndexPattern
            allIndices={state.allIndices}
            initialQuery={state.patternList || initialQuery}
            indexPatternCreationType={state.indexPatternCreationType}
            goToNextStep={goToTimeFieldStep}
            showSystemIndices={
              state.indexPatternCreationType.getShowSystemIndices() && state.step === 1
            }
          />
        </EuiPageContent>
      );
    }

    if (state.step === 2) {
      return (
        <EuiPageContent>
          {renderHeader}
          <EuiHorizontalRule />
          <StepTimeField
            createIndexPattern={createIndexPattern}
            goToPreviousStep={goToIndexPatternStep}
            indexPatternCreationType={state.indexPatternCreationType}
            patternList={state.patternList}
            selectedTimeField={state.selectedTimeField}
          />
        </EuiPageContent>
      );
    }

    return null;
  }, [
    createIndexPattern,
    goToIndexPatternStep,
    goToTimeFieldStep,
    props.location,
    renderHeader,
    state.allIndices,
    state.indexPatternCreationType,
    state.isInitiallyLoadingIndices,
    state.patternList,
    state.selectedTimeField,
    state.step,
  ]);

  return (
    <>
      {renderContent}
      <EuiGlobalToastList
        toasts={state.toasts}
        dismissToast={({ id }) => {
          removeToast(id);
        }}
        toastLifeTimeMs={6000}
      />
    </>
  );
};

export const CreateIndexPatternWizardWithRouter = withRouter(CreateIndexPatternWizard);
