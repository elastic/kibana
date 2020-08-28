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
import React, { RefObject } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { VisualizeTopNav } from './visualize_top_nav';
import { ExperimentalVisInfo } from './experimental_vis_info';
import {
  SavedVisInstance,
  VisualizeAppState,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../types';

interface VisualizeEditorCommonProps {
  visInstance?: VisualizeEditorVisInstance;
  appState: VisualizeAppStateContainer | null;
  currentAppState?: VisualizeAppState;
  isChromeVisible?: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  hasUnappliedChanges: boolean;
  isEmbeddableRendered: boolean;
  visEditorRef: RefObject<HTMLDivElement>;
  originatingApp?: string;
  setOriginatingApp?: (originatingApp: string | undefined) => void;
  visualizationIdFromUrl?: string;
  embeddableId?: string;
}

export const VisualizeEditorCommon = ({
  visInstance,
  appState,
  currentAppState,
  isChromeVisible,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  hasUnappliedChanges,
  isEmbeddableRendered,
  originatingApp,
  setOriginatingApp,
  visualizationIdFromUrl,
  embeddableId,
  visEditorRef,
}: VisualizeEditorCommonProps) => {
  return (
    <div className={`app-container visEditor visEditor--${visInstance?.vis.type.name}`}>
      {visInstance && appState && currentAppState && (
        <VisualizeTopNav
          currentAppState={currentAppState}
          hasUnsavedChanges={hasUnsavedChanges}
          setHasUnsavedChanges={setHasUnsavedChanges}
          isChromeVisible={isChromeVisible}
          isEmbeddableRendered={isEmbeddableRendered}
          hasUnappliedChanges={hasUnappliedChanges}
          originatingApp={originatingApp}
          setOriginatingApp={setOriginatingApp}
          visInstance={visInstance}
          stateContainer={appState}
          visualizationIdFromUrl={visualizationIdFromUrl}
          embeddableId={embeddableId}
        />
      )}
      {visInstance?.vis?.type?.isExperimental && <ExperimentalVisInfo />}
      {visInstance && (
        <EuiScreenReaderOnly>
          <h1>
            {'savedVis' in visInstance && visInstance.savedVis.id ? (
              <FormattedMessage
                id="visualize.pageHeading"
                defaultMessage="{chartName} {chartType} visualization"
                values={{
                  chartName: (visInstance as SavedVisInstance).savedVis.title,
                  chartType: (visInstance as SavedVisInstance).vis.type.title,
                }}
              />
            ) : (
              <FormattedMessage
                id="visualize.byValue_pageHeading"
                defaultMessage="Visualization of type {chartType} embedded into {originatingApp} app"
                values={{
                  chartType: visInstance.vis.type.title,
                  originatingApp: originatingApp || 'dashboards',
                }}
              />
            )}
          </h1>
        </EuiScreenReaderOnly>
      )}
      <div className={isChromeVisible ? 'visEditor__content' : 'visualize'} ref={visEditorRef} />
    </div>
  );
};
