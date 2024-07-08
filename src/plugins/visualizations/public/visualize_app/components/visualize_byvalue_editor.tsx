/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventEmitter } from 'events';
import React, { useEffect, useState, useMemo } from 'react';
import './visualize_editor.scss';
import { EuiErrorBoundary } from '@elastic/eui';

import { Query } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DefaultEditor } from '@kbn/vis-default-editor-plugin/public';
import { VisualizeConstants } from '../../../common/constants';
import { VisualizeAppProps } from '../app';
import { VisualizeServices } from '../types';
import {
  useChromeVisibility,
  useDataViewUpdates,
  useEditorUpdates,
  useEmbeddableApiHandler,
  useLinkedSearchUpdates,
  useVisualizeAppState,
} from '../utils';
import { VisualizeEditorCommon } from './visualize_editor_common';
import { useVisEditorBreadcrumbs } from '../utils/use/use_vis_editor_breadcrumbs';
import type { VisualizeSavedVisInputState } from '../../react_embeddable/types';
import { PersistedState } from '../../persisted_state';

export const VisualizeByValueEditor = ({ onAppLeave }: VisualizeAppProps) => {
  const [originatingApp, setOriginatingApp] = useState<string>();
  const [originatingPath, setOriginatingPath] = useState<string>();
  const { services } = useKibana<VisualizeServices>();
  const [eventEmitter] = useState(new EventEmitter());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [embeddableId, setEmbeddableId] = useState<string>();
  const [initialState, setInitialState] = useState<VisualizeSavedVisInputState>();

  const {
    timefilter: { timefilter },
    filterManager,
    queryString,
  } = services.data.query;

  const embeddableApiHandler = useEmbeddableApiHandler();
  const {
    openInspector: [openInspectorFn],
    navigateToLens: [navigateToLensFn],
    serializeState: [serializeStateFn],
    getVis: [getVis],
  } = embeddableApiHandler;

  useEffect(() => {
    const { stateTransferService, history, data } = services;
    const {
      originatingApp: value,
      embeddableId: embeddableIdValue,
      valueInput: valueInputValue,
      searchSessionId,
      originatingPath: pathValue,
    } = stateTransferService.getIncomingEditorState(VisualizeConstants.APP_ID) || {};

    setOriginatingPath(pathValue);
    setOriginatingApp(value);
    setEmbeddableId(embeddableIdValue);

    if (!valueInputValue) {
      // if there is no value input to load, redirect to the visualize listing page.
      history.replace(VisualizeConstants.LANDING_PAGE_PATH);
    }

    setInitialState(valueInputValue as VisualizeSavedVisInputState);

    if (searchSessionId) {
      data.search.session.continue(searchSessionId);
    } else {
      data.search.session.start();
    }
  }, [services]);

  const isChromeVisible = useChromeVisibility(services.chrome);

  const byValueVisInstance = useMemo(() => {
    if (!getVis || !serializeStateFn) return;
    const { savedVis, managed, sharingSavedObjectProps } = serializeStateFn().rawState;
    return {
      vis: getVis(),
      savedVis,
      savedObjectProperties: {
        managed,
        sharingSavedObjectProps,
      },
    };
  }, [getVis, serializeStateFn]);

  const { appState, hasUnappliedChanges } = useVisualizeAppState(
    services,
    eventEmitter,
    byValueVisInstance
  );
  const { isEmbeddableRendered, currentAppState } = useEditorUpdates(
    services,
    eventEmitter,
    setHasUnsavedChanges,
    appState,
    byValueVisInstance
  );
  const uiState = useMemo(
    () => new PersistedState(currentAppState?.uiState ?? {}),
    [currentAppState]
  );

  useLinkedSearchUpdates(services, eventEmitter, appState, byValueVisInstance);
  useDataViewUpdates(services, eventEmitter, appState, byValueVisInstance);
  useVisEditorBreadcrumbs({
    services,
    originatingApp,
    visTitle: byValueVisInstance?.vis.title,
  });

  useEffect(() => {
    // clean up all registered listeners if any is left
    return () => {
      eventEmitter.removeAllListeners();
    };
  }, [eventEmitter]);

  return (
    <VisualizeEditorCommon
      visInstance={byValueVisInstance}
      appState={appState}
      currentAppState={currentAppState}
      isChromeVisible={isChromeVisible}
      hasUnsavedChanges={hasUnsavedChanges}
      hasUnappliedChanges={hasUnappliedChanges}
      isEmbeddableRendered={isEmbeddableRendered}
      originatingApp={originatingApp}
      setOriginatingApp={setOriginatingApp}
      originatingPath={originatingPath}
      setHasUnsavedChanges={setHasUnsavedChanges}
      embeddableId={embeddableId}
      onAppLeave={onAppLeave}
      eventEmitter={eventEmitter}
      openInspectorFn={openInspectorFn}
      navigateToLensFn={navigateToLensFn}
      serializeStateFn={serializeStateFn}
    >
      {initialState && (
        <EuiErrorBoundary>
          <DefaultEditor
            initialState={initialState}
            references={[]}
            embeddableApiHandler={embeddableApiHandler}
            eventEmitter={eventEmitter}
            timeRange={timefilter.getTime()}
            filters={filterManager.getFilters()}
            query={queryString.getQuery() as Query}
            dataView={currentAppState?.dataView}
            uiState={uiState}
            linked={Boolean(currentAppState?.linked)}
          />
        </EuiErrorBoundary>
      )}
    </VisualizeEditorCommon>
  );
};
