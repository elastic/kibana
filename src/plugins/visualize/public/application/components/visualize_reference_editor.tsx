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

import './visualize_editor.scss';
import React, { useEffect, useState } from 'react';
import { EventEmitter } from 'events';

import { useKibana } from '../../../../kibana_react/public';
import {
  useChromeVisibility,
  useVisReference,
  useVisualizeAppState,
  useEditorUpdates,
  useLinkedSearchUpdates,
} from '../utils';
import { VisualizeServices } from '../types';
import { ExperimentalVisInfo } from './experimental_vis_info';
import { VisualizeTopNav } from './visualize_top_nav';

export const VisualizeReferenceEditor = () => {
  const [originatingApp, setOriginatingApp] = useState<string>();
  const { services } = useKibana<VisualizeServices>();
  const [eventEmitter] = useState(new EventEmitter());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);
  const [embeddableId, setEmbeddableId] = useState<string>();
  const [valueInput, setValueInput] = useState<string>();

  const isChromeVisible = useChromeVisibility(services.chrome);
  const { savedVisInstance, visEditorRef, visEditorController } = useVisReference(
    services,
    eventEmitter,
    isChromeVisible,
    false,
    valueInput
  );
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
    visEditorController
  );
  useLinkedSearchUpdates(services, eventEmitter, appState, savedVisInstance);

  useEffect(() => {
    const { originatingApp: value, embeddableId: embeddableIdValue, valueInput: valueInputValue } =
      services.embeddable
        .getStateTransfer(services.scopedHistory)
        .getIncomingEditorState({ keysToRemoveAfterFetch: ['id', 'embeddableId', 'valueInput'] }) ||
      {};
    setOriginatingApp(value);
    setValueInput(valueInputValue);
  }, [services]);

  useEffect(() => {
    // clean up all registered listeners if any is left
    return () => {
      eventEmitter.removeAllListeners();
    };
  }, [eventEmitter]);

  return (
    <div className={`app-container visEditor visEditor--${savedVisInstance?.vis.type.name}`}>
      {savedVisInstance && appState && currentAppState && (
        <VisualizeTopNav
          currentAppState={currentAppState}
          hasUnsavedChanges={hasUnsavedChanges}
          setHasUnsavedChanges={setHasUnsavedChanges}
          isChromeVisible={isChromeVisible}
          isEmbeddableRendered={isEmbeddableRendered}
          hasUnappliedChanges={hasUnappliedChanges}
          originatingApp={originatingApp}
          savedVisInstance={savedVisInstance}
          stateContainer={appState}
          embeddableId={embeddableId}
        />
      )}
      {savedVisInstance?.vis?.type?.isExperimental && <ExperimentalVisInfo />}
      <div className={isChromeVisible ? 'visEditor__content' : 'visualize'} ref={visEditorRef} />
    </div>
  );
};
