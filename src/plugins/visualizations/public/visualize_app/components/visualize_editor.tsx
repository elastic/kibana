/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiErrorBoundary, EuiLoadingChart } from '@elastic/eui';
import { EventEmitter } from 'events';
import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import './visualize_editor.scss';

import { Query } from '@kbn/es-query';
import { useExecutionContext, useKibana } from '@kbn/kibana-react-plugin/public';
import { VisualizeConstants } from '../../../common/constants';
import { VisualizeEditorInput } from '../../react_embeddable/types';
import { VisualizeAppProps } from '../app';
import { VisualizeServices } from '../types';
import {
  useChromeVisibility,
  useDataViewUpdates,
  useEditorUpdates,
  useEmbeddableApiHandler,
  useLinkedSearchUpdates,
  useSavedVisInstance,
  useVisualizeAppState,
} from '../utils';
import { useInitialVisState } from '../utils/use/use_initial_vis_state';
import { VisualizeEditorCommon } from './visualize_editor_common';

const DefaultEditor = React.lazy(async () => ({
  default: (await import('@kbn/vis-default-editor-plugin/public')).DefaultEditor,
}));

export const VisualizeEditor = ({ onAppLeave }: VisualizeAppProps) => {
  const { id: visualizationIdFromUrl } = useParams<{ id: string }>();
  const [originatingApp, setOriginatingApp] = useState<string>();
  const [originatingPath, setOriginatingPath] = useState<string>();
  const [embeddableIdValue, setEmbeddableId] = useState<string>();
  const [embeddableInput, setEmbeddableInput] = useState<VisualizeEditorInput>();
  const { services } = useKibana<VisualizeServices>();
  const [eventEmitter] = useState(new EventEmitter());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(!visualizationIdFromUrl);

  const embeddableApiHandler = useEmbeddableApiHandler();
  const {
    openInspector: [openInspectorFn],
    navigateToLens: [navigateToLensFn],
    serializeState: [serializeStateFn],
    getVis: [getVis],
  } = embeddableApiHandler;

  const isChromeVisible = useChromeVisibility(services.chrome);
  useEffect(() => {
    const { stateTransferService, data } = services;
    const {
      originatingApp: value,
      searchSessionId,
      embeddableId,
      originatingPath: pathValue,
      valueInput: valueInputValue,
    } = stateTransferService.getIncomingEditorState(VisualizeConstants.APP_ID) || {};

    if (searchSessionId) {
      data.search.session.continue(searchSessionId);
    } else {
      data.search.session.start();
    }
    setEmbeddableInput(valueInputValue as VisualizeEditorInput | undefined);
    setEmbeddableId(embeddableId);
    setOriginatingApp(value);
    setOriginatingPath(pathValue);
  }, [services]);
  const { VisEditor } = useSavedVisInstance(
    services,
    eventEmitter,
    isChromeVisible,
    embeddableApiHandler,
    originatingApp,
    visualizationIdFromUrl,
    embeddableInput
  );
  const savedVisInstance = useMemo(() => {
    if (!getVis || !serializeStateFn) return;
    return {
      vis: getVis?.(),
      savedVis: serializeStateFn?.(),
    };
  }, [getVis, serializeStateFn]);
  const editorName = savedVisInstance?.vis.type.title.toLowerCase().replace(' ', '_') || '';
  useExecutionContext(services.executionContext, {
    type: 'application',
    page: `editor${editorName ? `:${editorName}` : ''}`,
    id: visualizationIdFromUrl || 'new',
  });

  const {
    timefilter: { timefilter },
    filterManager,
    queryString,
  } = services.data.query;

  const { appState, hasUnappliedChanges } = useVisualizeAppState(
    services,
    eventEmitter,
    savedVisInstance
  );
  const { isEmbeddableRendered, currentAppState } = useEditorUpdates(
    services,
    eventEmitter,
    setHasUnsavedChanges,
    appState,
    savedVisInstance,
    VisEditor
  );
  console.log('App state', currentAppState);
  const [initialState, references] = useInitialVisState({ visualizationIdFromUrl, services });

  useLinkedSearchUpdates(services, eventEmitter, appState, savedVisInstance);
  useDataViewUpdates(services, eventEmitter, appState, savedVisInstance);

  useEffect(() => {
    // clean up all registered listeners if any is left
    return () => {
      eventEmitter.removeAllListeners();
    };
  }, [eventEmitter, services]);

  return (
    <VisualizeEditorCommon
      visInstance={savedVisInstance}
      appState={appState}
      currentAppState={currentAppState}
      isChromeVisible={isChromeVisible}
      hasUnsavedChanges={hasUnsavedChanges}
      hasUnappliedChanges={hasUnappliedChanges}
      isEmbeddableRendered={isEmbeddableRendered}
      originatingApp={originatingApp}
      setOriginatingApp={setOriginatingApp}
      originatingPath={originatingPath}
      visualizationIdFromUrl={visualizationIdFromUrl}
      setHasUnsavedChanges={setHasUnsavedChanges}
      onAppLeave={onAppLeave}
      embeddableId={embeddableIdValue}
      eventEmitter={eventEmitter}
      openInspectorFn={openInspectorFn}
      navigateToLensFn={navigateToLensFn}
      serializeStateFn={serializeStateFn}
    >
      <EuiErrorBoundary>
        <Suspense
          fallback={
            <div
              style={{
                display: 'flex',
                flex: '1 1 auto',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <EuiLoadingChart size="xl" mono />
            </div>
          }
        >
          <DefaultEditor
            initialState={initialState}
            references={references}
            embeddableApiHandler={embeddableApiHandler}
            eventEmitter={eventEmitter}
            timeRange={timefilter.getTime()}
            filters={filterManager.getFilters()}
            query={queryString.getQuery() as Query}
            dataView={currentAppState?.dataView}
          />
        </Suspense>
      </EuiErrorBoundary>
    </VisualizeEditorCommon>
  );
};
