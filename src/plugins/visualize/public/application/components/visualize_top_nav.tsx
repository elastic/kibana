/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';

import { AppMountParameters, OverlayRef } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../kibana_react/public';
import {
  VisualizeServices,
  VisualizeAppState,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../types';
import { APP_NAME } from '../visualize_constants';
import { getTopNavConfig } from '../utils';
import type { IndexPattern } from '../../../../data/public';

interface VisualizeTopNavProps {
  currentAppState: VisualizeAppState;
  isChromeVisible?: boolean;
  isEmbeddableRendered: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  hasUnappliedChanges: boolean;
  originatingApp?: string;
  visInstance: VisualizeEditorVisInstance;
  setOriginatingApp?: (originatingApp: string | undefined) => void;
  stateContainer: VisualizeAppStateContainer;
  visualizationIdFromUrl?: string;
  embeddableId?: string;
  onAppLeave: AppMountParameters['onAppLeave'];
}

const TopNav = ({
  currentAppState,
  isChromeVisible,
  isEmbeddableRendered,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  hasUnappliedChanges,
  originatingApp,
  setOriginatingApp,
  visInstance,
  stateContainer,
  visualizationIdFromUrl,
  embeddableId,
  onAppLeave,
}: VisualizeTopNavProps) => {
  const { services } = useKibana<VisualizeServices>();
  const { TopNavMenu } = services.navigation.ui;
  const { setHeaderActionMenu, visualizeCapabilities } = services;
  const { embeddableHandler, vis } = visInstance;
  const [inspectorSession, setInspectorSession] = useState<OverlayRef>();
  const openInspector = useCallback(() => {
    const session = embeddableHandler.openInspector();
    setInspectorSession(session);
  }, [embeddableHandler]);
  const handleRefresh = useCallback(
    (_payload: any, isUpdate?: boolean) => {
      if (isUpdate === false) {
        visInstance.embeddableHandler.reload();
      }
    },
    [visInstance.embeddableHandler]
  );

  const config = useMemo(() => {
    if (isEmbeddableRendered) {
      return getTopNavConfig(
        {
          hasUnsavedChanges,
          setHasUnsavedChanges,
          hasUnappliedChanges,
          openInspector,
          originatingApp,
          setOriginatingApp,
          visInstance,
          stateContainer,
          visualizationIdFromUrl,
          stateTransfer: services.stateTransferService,
          embeddableId,
        },
        services
      );
    }
  }, [
    isEmbeddableRendered,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    hasUnappliedChanges,
    openInspector,
    originatingApp,
    visInstance,
    setOriginatingApp,
    stateContainer,
    visualizationIdFromUrl,
    services,
    embeddableId,
  ]);
  const [indexPatterns, setIndexPatterns] = useState<IndexPattern[]>(
    vis.data.indexPattern ? [vis.data.indexPattern] : []
  );
  const showDatePicker = () => {
    // tsvb loads without an indexPattern initially (TODO investigate).
    // hide timefilter only if timeFieldName is explicitly undefined.
    const hasTimeField = vis.data.indexPattern ? !!vis.data.indexPattern.timeFieldName : true;
    return vis.type.options.showTimePicker && hasTimeField;
  };
  const showFilterBar = vis.type.options.showFilterBar;
  const showQueryInput = vis.type.requiresSearch && vis.type.options.showQueryBar;

  useEffect(() => {
    return () => {
      if (inspectorSession) {
        // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
        inspectorSession.close();
      }
    };
  }, [inspectorSession]);

  useEffect(() => {
    onAppLeave((actions) => {
      // Confirm when the user has made any changes to an existing visualizations
      // or when the user has configured something without saving
      if (
        originatingApp &&
        (hasUnappliedChanges || hasUnsavedChanges) &&
        !services.stateTransferService.isTransferInProgress
      ) {
        return actions.confirm(
          i18n.translate('visualize.confirmModal.confirmTextDescription', {
            defaultMessage: 'Leave Visualize editor with unsaved changes?',
          }),
          i18n.translate('visualize.confirmModal.title', {
            defaultMessage: 'Unsaved changes',
          })
        );
      }
      return actions.default();
    });
    return () => {
      // reset on app leave handler so leaving from the listing page doesn't trigger a confirmation
      onAppLeave((actions) => actions.default());
    };
  }, [
    onAppLeave,
    originatingApp,
    hasUnsavedChanges,
    hasUnappliedChanges,
    visualizeCapabilities.save,
    services.stateTransferService.isTransferInProgress,
  ]);

  useEffect(() => {
    const asyncSetIndexPattern = async () => {
      let indexes: IndexPattern[] | undefined;

      if (vis.type.getUsedIndexPattern) {
        indexes = await vis.type.getUsedIndexPattern(vis.params);
      }
      if (!indexes || !indexes.length) {
        const defaultIndex = await services.data.indexPatterns.getDefault();
        if (defaultIndex) {
          indexes = [defaultIndex];
        }
      }
      if (indexes) {
        setIndexPatterns(indexes);
      }
    };

    if (!vis.data.indexPattern) {
      asyncSetIndexPattern();
    }
  }, [vis.params, vis.type, services.data.indexPatterns, vis.data.indexPattern]);

  useEffect(() => {
    const autoRefreshFetchSub = services.data.query.timefilter.timefilter
      .getAutoRefreshFetch$()
      .subscribe(() => {
        visInstance.embeddableHandler.reload();
      });
    return () => {
      autoRefreshFetchSub.unsubscribe();
    };
  }, [services.data.query.timefilter.timefilter, visInstance.embeddableHandler]);

  return isChromeVisible ? (
    /**
     * Most visualizations have all search bar components enabled.
     * Some visualizations have fewer options, but all visualizations have the search bar.
     * That's is why the showSearchBar prop is set.
     * All visualizations also have the timepicker\autorefresh component,
     * it is enabled by default in the TopNavMenu component.
     */
    <TopNavMenu
      appName={APP_NAME}
      config={config}
      setMenuMountPoint={setHeaderActionMenu}
      onQuerySubmit={handleRefresh}
      savedQueryId={currentAppState.savedQuery}
      onSavedQueryIdChange={stateContainer.transitions.updateSavedQuery}
      indexPatterns={indexPatterns}
      screenTitle={vis.title}
      showAutoRefreshOnly={!showDatePicker()}
      showDatePicker={showDatePicker()}
      showFilterBar={showFilterBar}
      showQueryInput={showQueryInput}
      showSaveQuery={services.visualizeCapabilities.saveQuery}
      showSearchBar
      useDefaultBehaviors
    />
  ) : showFilterBar ? (
    /**
     * The top nav is hidden in embed mode, but the filter bar must still be present so
     * we show the filter bar on its own here if the chrome is not visible.
     */
    <TopNavMenu
      appName={APP_NAME}
      setMenuMountPoint={setHeaderActionMenu}
      indexPatterns={indexPatterns}
      showSearchBar
      showSaveQuery={false}
      showDatePicker={false}
      showQueryInput={false}
    />
  ) : null;
};

export const VisualizeTopNav = memo(TopNav);
