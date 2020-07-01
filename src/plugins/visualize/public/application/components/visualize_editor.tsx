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
import { useParams } from 'react-router-dom';
import { EventEmitter } from 'events';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiScreenReaderOnly } from '@elastic/eui';

import { useKibana } from '../../../../kibana_react/public';
import {
  useChromeVisibility,
  useSavedVisInstance,
  useVisualizeAppState,
  useEditorUpdates,
  useLinkedSearchUpdates,
} from '../utils';
import { VisualizeServices } from '../types';
import { ExperimentalVisInfo } from './experimental_vis_info';
import { VisualizeTopNav } from './visualize_top_nav';

export const VisualizeEditor = () => {
  const { id: visualizationIdFromUrl } = useParams();
  const [originatingApp, setOriginatingApp] = useState<string>();
  const { services } = useKibana<VisualizeServices>();
  const [eventEmitter] = useState(new EventEmitter());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(!visualizationIdFromUrl);

  const isChromeVisible = useChromeVisibility(services.chrome);
  const { savedVisInstance, visEditorRef, visEditorController } = useSavedVisInstance(
    services,
    eventEmitter,
    isChromeVisible,
    visualizationIdFromUrl
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
    const { originatingApp: value } =
      services.embeddable.getStateTransfer(services.scopedHistory).getIncomingEditorState() || {};
    setOriginatingApp(value);
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
          visualizationIdFromUrl={visualizationIdFromUrl}
        />
      )}
      {savedVisInstance?.vis?.type?.isExperimental && <ExperimentalVisInfo />}
      {savedVisInstance && (
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="visualize.pageHeading"
              defaultMessage="{chartName} {chartType} visualization"
              values={{
                chartName: savedVisInstance.savedVis.title,
                chartType: savedVisInstance.vis.type.title,
              }}
            />
          </h1>
        </EuiScreenReaderOnly>
      )}
      <div className={isChromeVisible ? 'visEditor__content' : 'visualize'} ref={visEditorRef} />
    </div>
  );
};
