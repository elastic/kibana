/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './visualize_editor.scss';
import React, { RefObject, useCallback, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { AppMountParameters } from 'kibana/public';
import { VisualizeTopNav } from './visualize_top_nav';
import { ExperimentalVisInfo } from './experimental_vis_info';
import { useKibana } from '../../../../kibana_react/public';
import { urlFor } from '../../../../visualizations/public';
import {
  SavedVisInstance,
  VisualizeAppState,
  VisualizeServices,
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
  onAppLeave: AppMountParameters['onAppLeave'];
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
  onAppLeave,
  originatingApp,
  setOriginatingApp,
  visualizationIdFromUrl,
  embeddableId,
  visEditorRef,
}: VisualizeEditorCommonProps) => {
  const { services } = useKibana<VisualizeServices>();

  useEffect(() => {
    async function aliasMatchRedirect() {
      const sharingSavedObjectProps = visInstance?.savedVis.sharingSavedObjectProps;
      if (services.spaces && sharingSavedObjectProps?.outcome === 'aliasMatch') {
        // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
        const newObjectId = sharingSavedObjectProps?.aliasTargetId; // This is always defined if outcome === 'aliasMatch'
        const newPath = `${urlFor(newObjectId!)}${services.history.location.search}`;
        await services.spaces.ui.redirectLegacyUrl(
          newPath,
          i18n.translate('visualize.legacyUrlConflict.objectNoun', {
            defaultMessage: '{visName} visualization',
            values: {
              visName: visInstance?.vis?.type.title,
            },
          })
        );
        return;
      }
    }

    aliasMatchRedirect();
  }, [visInstance?.savedVis.sharingSavedObjectProps, visInstance?.vis?.type.title, services]);

  const getLegacyUrlConflictCallout = useCallback(() => {
    // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
    const currentObjectId = visInstance?.savedVis.id;
    const sharingSavedObjectProps = visInstance?.savedVis.sharingSavedObjectProps;
    if (services.spaces && sharingSavedObjectProps?.outcome === 'conflict' && currentObjectId) {
      // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
      // callout with a warning for the user, and provide a way for them to navigate to the other object.
      const otherObjectId = sharingSavedObjectProps?.aliasTargetId!; // This is always defined if outcome === 'conflict'
      const otherObjectPath = `${urlFor(otherObjectId)}${services.history.location.search}`;
      return services.spaces.ui.components.getLegacyUrlConflict({
        objectNoun: i18n.translate('visualize.legacyUrlConflict.objectNoun', {
          defaultMessage: '{visName} visualization',
          values: {
            visName: visInstance?.vis?.type.title,
          },
        }),
        currentObjectId,
        otherObjectId,
        otherObjectPath,
      });
    }
    return null;
  }, [visInstance?.savedVis, services, visInstance?.vis?.type.title]);

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
      {visInstance?.vis?.type?.getInfoMessage?.(visInstance.vis)}
      {getLegacyUrlConflictCallout()}
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
