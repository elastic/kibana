/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './visualize_editor.scss';
import React, { RefObject } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { AppMountParameters } from 'kibana/public';
import { VisualizeTopNav } from './visualize_top_nav';
import { ExperimentalVisInfo } from './experimental_vis_info';
import { DeprecationWarning, LEGACY_CHARTS_LIBRARY } from './deprecation_vis_warning';
import {
  SavedVisInstance,
  VisualizeAppState,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../types';
import { getUISettings } from '../../services';

interface VisualizeEditorCommonProps {
  visInstance?: VisualizeEditorVisInstance;
  appState: VisualizeAppStateContainer | null;
  currentAppState?: VisualizeAppState;
  isChromeVisible?: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  hasUnappliedChanges: boolean;
  isEmbeddableRendered: boolean;
  onAppLeave: AppMountParameters['onAppLeave'];
  visEditorRef: RefObject<HTMLDivElement>;
  originatingApp?: string;
  setOriginatingApp?: (originatingApp: string | undefined) => void;
  visualizationIdFromUrl?: string;
  embeddableId?: string;
}

const isXYAxis = (visType: string | undefined): boolean => {
  if (!visType) {
    return false;
  }
  return ['area', 'line', 'histogram', 'horizontal_bar', 'point_series'].includes(visType);
};

export const VisualizeEditorCommon = ({
  visInstance,
  appState,
  currentAppState,
  isChromeVisible,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  hasUnappliedChanges,
  isEmbeddableRendered,
  onAppLeave,
  originatingApp,
  setOriginatingApp,
  visualizationIdFromUrl,
  embeddableId,
  visEditorRef,
}: VisualizeEditorCommonProps) => {
  const hasXYLegacyChartsEnabled = getUISettings().get(LEGACY_CHARTS_LIBRARY);
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
          onAppLeave={onAppLeave}
        />
      )}
      {visInstance?.vis?.type?.stage === 'experimental' && <ExperimentalVisInfo />}
      {/* Adds a deprecation warning for vislib xy axis charts */}
      {/* Should be removed when this issue is closed https://github.com/elastic/kibana/issues/103209 */}
      {isXYAxis(visInstance?.vis.type.name) && hasXYLegacyChartsEnabled && <DeprecationWarning />}
      {visInstance?.vis?.type?.getInfoMessage?.(visInstance.vis)}
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
