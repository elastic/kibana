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

import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { isEqual } from 'lodash';

import { OverlayRef } from 'kibana/public';
import { Query } from 'src/plugins/data/public';
import { useKibana } from '../../../../kibana_react/public';
import {
  VisualizeServices,
  VisualizeAppState,
  VisualizeAppStateContainer,
  SavedVisInstance,
} from '../types';
import { APP_NAME } from '../visualize_constants';
import { getTopNavConfig } from '../utils';

interface VisualizeTopNavProps {
  currentAppState: VisualizeAppState;
  isChromeVisible?: boolean;
  isEmbeddableRendered: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  hasUnappliedChanges: boolean;
  originatingApp?: string;
  savedVisInstance: SavedVisInstance;
  stateContainer: VisualizeAppStateContainer;
  visualizationIdFromUrl?: string;
}

const TopNav = ({
  currentAppState,
  isChromeVisible,
  isEmbeddableRendered,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  hasUnappliedChanges,
  originatingApp,
  savedVisInstance,
  stateContainer,
  visualizationIdFromUrl,
}: VisualizeTopNavProps) => {
  const { services } = useKibana<VisualizeServices>();
  const { TopNavMenu } = services.navigation.ui;
  const { embeddableHandler, vis } = savedVisInstance;
  const [inspectorSession, setInspectorSession] = useState<OverlayRef>();
  const openInspector = useCallback(() => {
    const session = embeddableHandler.openInspector();
    setInspectorSession(session);
  }, [embeddableHandler]);

  const updateQuery = useCallback(
    ({ query }: { query?: Query }) => {
      if (!isEqual(currentAppState.query, query)) {
        stateContainer.transitions.set('query', query || currentAppState.query);
      } else {
        savedVisInstance.embeddableHandler.reload();
      }
    },
    [currentAppState.query, savedVisInstance.embeddableHandler, stateContainer.transitions]
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
          savedVisInstance,
          stateContainer,
          visualizationIdFromUrl,
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
    savedVisInstance,
    stateContainer,
    visualizationIdFromUrl,
    services,
  ]);
  const [indexPattern, setIndexPattern] = useState(vis.data.indexPattern);
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
    if (!vis.data.indexPattern) {
      services.data.indexPatterns.getDefault().then((index) => {
        if (index) {
          setIndexPattern(index);
        }
      });
    }
  }, [services.data.indexPatterns, vis.data.indexPattern]);

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
      query={currentAppState.query}
      onQuerySubmit={updateQuery}
      savedQueryId={currentAppState.savedQuery}
      onSavedQueryIdChange={stateContainer.transitions.updateSavedQuery}
      indexPatterns={indexPattern ? [indexPattern] : undefined}
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
      indexPatterns={indexPattern ? [indexPattern] : undefined}
      showSearchBar
      showSaveQuery={false}
      showDatePicker={false}
      showQueryInput={false}
    />
  ) : null;
};

export const VisualizeTopNav = memo(TopNav);
