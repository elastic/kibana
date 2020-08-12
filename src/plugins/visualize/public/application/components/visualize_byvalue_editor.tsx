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

export const VisualizeByValueEditor = () => {
  const [originatingApp, setOriginatingApp] = useState<string>();
  const { services } = useKibana<VisualizeServices>();
  const [eventEmitter] = useState(new EventEmitter());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(true);
  const [embeddableId, setEmbeddableId] = useState<string>();
  const [valueInput, setValueInput] = useState<VisualizeInput>();

  useEffect(() => {
    const { originatingApp: value, embeddableId: embeddableIdValue, valueInput: valueInputValue } =
      services.embeddable
        .getStateTransfer(services.scopedHistory)
        .getIncomingEditorState({ keysToRemoveAfterFetch: ['id', 'embeddableId', 'valueInput'] }) ||
      {};
    setOriginatingApp(value);
    setValueInput(valueInputValue);
    setEmbeddableId(embeddableIdValue);
    if (!valueInputValue) {
      history.back();
    }
  }, [services]);

  const isChromeVisible = useChromeVisibility(services.chrome);

  const { byValueVisInstance, visEditorRef, visEditorController } = useVisByValue(
    services,
    eventEmitter,
    isChromeVisible,
    valueInput,
    originatingApp
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
      setHasUnsavedChanges={setHasUnsavedChanges}
      visEditorRef={visEditorRef}
      embeddableId={embeddableId}
    />
  );
};
