/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EventEmitter } from 'events';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { VisualizeConstants } from '@kbn/visualizations-common';
import type { VisualizeInput } from '../..';
import {
  useChromeVisibility,
  useVisByValue,
  useVisualizeAppState,
  useEditorUpdates,
  useLinkedSearchUpdates,
  useDataViewUpdates,
} from '../utils';
import type { VisualizeServices } from '../types';
import { VisualizeEditorCommon } from './visualize_editor_common';
import type { VisualizeAppProps } from '../app';
import { useProjectRouting } from '../utils/use/use_project_routing';

export const VisualizeByValueEditor = ({ onAppLeave }: VisualizeAppProps) => {
  const [originatingApp, setOriginatingApp] = useState<string>();
  const [originatingPath, setOriginatingPath] = useState<string>();
  const { services } = useKibana<VisualizeServices>();
  const [eventEmitter] = useState(new EventEmitter());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [embeddableId, setEmbeddableId] = useState<string>();
  const [valueInput, setValueInput] = useState<VisualizeInput>();

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
    setValueInput(valueInputValue as VisualizeInput | undefined);
    setEmbeddableId(embeddableIdValue);

    if (!valueInputValue) {
      // if there is no value input to load, redirect to the visualize listing page.
      history.replace(VisualizeConstants.LANDING_PAGE_PATH);
    }

    if (searchSessionId) {
      data.search.session.continue(searchSessionId);
    } else {
      data.search.session.start();
    }
  }, [services]);

  const isChromeVisible = useChromeVisibility(services.chrome);

  const { byValueVisInstance, visEditorRef, visEditorController } = useVisByValue(
    services,
    eventEmitter,
    isChromeVisible,
    valueInput,
    originatingApp,
    originatingPath
  );
  const { appState, hasUnappliedChanges } = useVisualizeAppState(
    services,
    eventEmitter,
    byValueVisInstance
  );
  // Initialize CPS project routing manager for Vega
  const projectRoutingManager = useProjectRouting(services);
  const { isEmbeddableRendered, currentAppState } = useEditorUpdates(
    services,
    eventEmitter,
    setHasUnsavedChanges,
    appState,
    byValueVisInstance,
    visEditorController,
    projectRoutingManager
  );
  useLinkedSearchUpdates(services, eventEmitter, appState, byValueVisInstance);
  useDataViewUpdates(services, eventEmitter, appState, byValueVisInstance);

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
      visEditorRef={visEditorRef}
      embeddableId={embeddableId}
      onAppLeave={onAppLeave}
      eventEmitter={eventEmitter}
    />
  );
};
