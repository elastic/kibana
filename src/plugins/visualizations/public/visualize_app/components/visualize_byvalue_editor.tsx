/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './visualize_editor.scss';
import React, { useEffect, useState } from 'react';
import { EventEmitter } from 'events';

import { VisualizeInput } from 'src/plugins/visualizations/public';
import { useKibana } from '../../../../kibana_react/public';
import {
  useChromeVisibility,
  useVisByValue,
  useVisualizeAppState,
  useEditorUpdates,
  useLinkedSearchUpdates,
} from '../utils';
import { VisualizeServices } from '../types';
import { VisualizeEditorCommon } from './visualize_editor_common';
import { VisualizeAppProps } from '../app';
import { VisualizeConstants } from '../../../common/constants';

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
    setValueInput(valueInputValue);
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
  const { isEmbeddableRendered, currentAppState } = useEditorUpdates(
    services,
    eventEmitter,
    setHasUnsavedChanges,
    appState,
    byValueVisInstance,
    visEditorController
  );
  useLinkedSearchUpdates(services, eventEmitter, appState, byValueVisInstance);

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
    />
  );
};
