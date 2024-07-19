/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { EventEmitter } from 'events';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import './visualize_editor.scss';

import { Query } from '@kbn/es-query';
import { useExecutionContext, useKibana } from '@kbn/kibana-react-plugin/public';
import { DefaultEditor } from '@kbn/vis-default-editor-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { VisualizeConstants, VISUALIZE_APP_NAME } from '../../../common/constants';
import { PersistedState } from '../../persisted_state';
import { VisualizeAppProps } from '../app';
import { VisualizeServices } from '../types';
import {
  useChromeVisibility,
  useEmbeddableApiHandler,
  useLinkedSearchUpdates,
  useVisualizeAppState,
} from '../utils';
import { useInitialVisState } from '../utils/use/use_initial_vis_state';
import { useVisEditorBreadcrumbs } from '../utils/use/use_vis_editor_breadcrumbs';
import { VisualizeEditorCommon } from './visualize_editor_common';

export const VisualizeEditor = ({ onAppLeave }: VisualizeAppProps) => {
  const { id: visualizationIdFromUrl } = useParams<{ id: string }>();
  const [originatingApp, setOriginatingApp] = useState<string>();
  const [originatingPath, setOriginatingPath] = useState<string>();
  const [embeddableIdValue, setEmbeddableId] = useState<string>();
  const { services } = useKibana<VisualizeServices>();
  const [eventEmitter] = useState(new EventEmitter());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(!visualizationIdFromUrl);

  const {
    timefilter: { timefilter },
    filterManager,
    queryString,
    state$: queryState$,
  } = services.data.query;

  const queryState = useObservable(queryState$);
  const {
    filters,
    query,
    time: timeRange,
  } = queryState?.state ?? {
    filters: filterManager.getFilters(),
    query: queryString.getQuery(),
    time: timefilter.getTime(),
  };

  const {
    savedSearch,
    core: {
      application: { navigateToApp },
    },
  } = services;

  const onRedirectToLegacy = useCallback(() => {
    navigateToApp(VISUALIZE_APP_NAME, {
      path: `#${VisualizeConstants.LEGACY_EDIT_PATH}/${visualizationIdFromUrl}`,
    });
  }, [visualizationIdFromUrl, navigateToApp]);

  const embeddableApiHandler = useEmbeddableApiHandler();
  const {
    openInspector: [openInspectorFn],
    navigateToLens: [navigateToLensFn],
    serializeState: [serializeStateFn],
    snapshotState: [snapshotStateFn],
    getVis: [getVis],
    updateVis: [updateVis],
  } = embeddableApiHandler;

  const isChromeVisible = useChromeVisibility(services.chrome);
  useEffect(() => {
    const { stateTransferService, data } = services;
    const {
      originatingApp: value,
      searchSessionId,
      embeddableId,
      originatingPath: pathValue,
    } = stateTransferService.getIncomingEditorState(VisualizeConstants.APP_ID) || {};

    if (searchSessionId) {
      data.search.session.continue(searchSessionId);
    } else {
      data.search.session.start();
    }
    setEmbeddableId(embeddableId);
    setOriginatingApp(value);
    setOriginatingPath(pathValue);
  }, [services]);

  const savedVisInstance = useMemo(() => {
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
  const editorName = savedVisInstance?.vis.type.title.toLowerCase().replace(' ', '_') || '';
  const visTitle = useMemo(() => savedVisInstance?.vis.title, [savedVisInstance?.vis.title]);
  useExecutionContext(services.executionContext, {
    type: 'application',
    page: `editor${editorName ? `:${editorName}` : ''}`,
    id: visualizationIdFromUrl || 'new',
  });

  const { stateContainer, currentAppState, hasUnappliedChanges } = useVisualizeAppState(
    services,
    eventEmitter,
    updateVis
  );

  // useEditorUpdates(services, eventEmitter, setHasUnsavedChanges, stateContainer, savedVisInstance);

  const uiState = useMemo(
    () => new PersistedState(currentAppState?.uiState ?? {}),
    [currentAppState]
  );

  const [initialState, references] = useInitialVisState({ visualizationIdFromUrl, services });

  useLinkedSearchUpdates(services, eventEmitter, stateContainer, savedVisInstance);
  // useDataViewUpdates(services, eventEmitter, appState, savedVisInstance);
  useVisEditorBreadcrumbs({
    services,
    originatingApp,
    visTitle,
  });

  useEffect(() => {
    // clean up all registered listeners if any is left
    return () => {
      eventEmitter.removeAllListeners();
    };
  }, [eventEmitter, services]);

  return (
    <VisualizeEditorCommon
      visInstance={savedVisInstance}
      appState={stateContainer}
      currentAppState={currentAppState}
      isChromeVisible={isChromeVisible}
      hasUnsavedChanges={hasUnsavedChanges}
      hasUnappliedChanges={hasUnappliedChanges}
      originatingApp={originatingApp}
      setOriginatingApp={setOriginatingApp}
      originatingPath={originatingPath}
      setHasUnsavedChanges={setHasUnsavedChanges}
      onAppLeave={onAppLeave}
      embeddableId={embeddableIdValue}
      eventEmitter={eventEmitter}
      openInspectorFn={openInspectorFn}
      navigateToLensFn={navigateToLensFn}
      serializeStateFn={serializeStateFn}
      snapshotStateFn={snapshotStateFn}
    >
      <EuiErrorBoundary>
        <DefaultEditor
          initialState={initialState}
          updateUrlState={stateContainer.updateUrlState}
          references={references}
          embeddableApiHandler={embeddableApiHandler}
          eventEmitter={eventEmitter}
          timeRange={timeRange!}
          filters={filters!}
          query={query as Query}
          dataView={currentAppState?.dataView}
          uiState={uiState}
          savedSearchService={savedSearch}
          onRedirectToLegacy={onRedirectToLegacy}
        />
      </EuiErrorBoundary>
    </VisualizeEditorCommon>
  );
};
