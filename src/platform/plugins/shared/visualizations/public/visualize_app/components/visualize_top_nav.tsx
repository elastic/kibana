/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { EventEmitter } from 'events';
import { AppMountParameters, OverlayRef } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { switchMap } from 'rxjs';
import { getManagedContentBadge } from '@kbn/managed-content-badge';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import type {
  VisualizeServices,
  VisualizeAppState,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../types';
import { VISUALIZE_APP_NAME } from '../../../common/constants';
import { getTopNavConfig, isFallbackDataView } from '../utils';

const LOCAL_STORAGE_EDIT_IN_LENS_BADGE = 'EDIT_IN_LENS_BADGE_VISIBLE';

interface VisualizeTopNavProps {
  currentAppState: VisualizeAppState;
  isChromeVisible?: boolean;
  isEmbeddableRendered: boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  hasUnappliedChanges: boolean;
  originatingApp?: string;
  originatingPath?: string;
  visInstance: VisualizeEditorVisInstance;
  setOriginatingApp?: (originatingApp: string | undefined) => void;
  stateContainer: VisualizeAppStateContainer;
  visualizationIdFromUrl?: string;
  embeddableId?: string;
  onAppLeave: AppMountParameters['onAppLeave'];
  eventEmitter?: EventEmitter;
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
  originatingPath,
  visInstance,
  stateContainer,
  visualizationIdFromUrl,
  embeddableId,
  onAppLeave,
  eventEmitter,
}: VisualizeTopNavProps & { intl: InjectedIntl }) => {
  const { services } = useKibana<VisualizeServices>();
  const { TopNavMenu } = services.navigation.ui;
  const { setHeaderActionMenu, visualizeCapabilities } = services;
  const {
    embeddableHandler,
    vis,
    savedVis: { managed },
  } = visInstance;
  const [inspectorSession, setInspectorSession] = useState<OverlayRef>();
  const [navigateToLens, setNavigateToLens] = useState(false);
  const [displayEditInLensItem, setDisplayEditInLensItem] = useState(false);
  // If the user has clicked the edit in lens button, we want to hide the badge.
  // The information is stored in local storage to persist across reloads.
  const [hideTryInLensBadge, setHideTryInLensBadge] = useLocalStorage(
    LOCAL_STORAGE_EDIT_IN_LENS_BADGE,
    false
  );
  const hideLensBadge = useCallback(() => {
    setHideTryInLensBadge(true);
  }, [setHideTryInLensBadge]);

  const openInspector = useCallback(() => {
    const session = embeddableHandler.openInspector();
    setInspectorSession(session);
  }, [embeddableHandler]);

  const doReload = useCallback(async () => {
    // start a new session to make sure all data is up to date
    services.data.search.session.start();

    // embeddable handler is subscribed to session service and will refresh
  }, [services.data.search.session]);

  const handleRefresh = useCallback(
    (_payload: any, isUpdate?: boolean) => {
      if (isUpdate === false) {
        doReload();
      }
    },
    [doReload]
  );

  useEffect(() => {
    const subscription = embeddableHandler
      .getExpressionVariables$()
      .subscribe((expressionVariables) => {
        setDisplayEditInLensItem(
          Boolean(vis.type.navigateToLens && expressionVariables?.canNavigateToLens)
        );
      });
    return () => {
      subscription.unsubscribe();
    };
  }, [embeddableHandler, vis]);

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
          originatingPath,
          visInstance,
          stateContainer,
          visualizationIdFromUrl,
          stateTransfer: services.stateTransferService,
          embeddableId,
          displayEditInLensItem,
          hideLensBadge,
          setNavigateToLens,
          showBadge: !hideTryInLensBadge && displayEditInLensItem,
          eventEmitter,
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
    setOriginatingApp,
    originatingPath,
    visInstance,
    stateContainer,
    visualizationIdFromUrl,
    services,
    embeddableId,
    displayEditInLensItem,
    hideLensBadge,
    hideTryInLensBadge,
    eventEmitter,
  ]);
  const [indexPatterns, setIndexPatterns] = useState<DataView[]>([]);
  const showDatePicker = () => {
    // tsvb loads without an indexPattern initially (TODO investigate).
    // hide timefilter only if timeFieldName is explicitly undefined.
    const hasTimeField = vis.data.indexPattern ? !!vis.data.indexPattern.timeFieldName : true;
    return vis.type.options.showTimePicker && hasTimeField;
  };
  const showFilterBar = vis.type.options.showFilterBar;
  const showQueryInput = vis.type.requiresSearch && vis.type.options.showQueryInput;

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
      // the warning won't appear if you navigate from the Viz editor to Lens
      if (
        originatingApp &&
        (hasUnappliedChanges || hasUnsavedChanges) &&
        !services.stateTransferService.isTransferInProgress &&
        !navigateToLens
      ) {
        return actions.confirm(
          i18n.translate('visualizations.confirmModal.confirmTextDescription', {
            defaultMessage: 'Leave Visualize editor with unsaved changes?',
          }),
          i18n.translate('visualizations.confirmModal.title', {
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
    navigateToLens,
  ]);

  useEffect(() => {
    const asyncSetIndexPattern = async () => {
      let indexes: DataView[] | undefined;

      if (vis.data.indexPattern) {
        indexes = [vis.data.indexPattern];
      } else if (vis.type.getUsedIndexPattern) {
        indexes = await vis.type.getUsedIndexPattern(vis.params);
      }
      if (!indexes || !indexes.length) {
        const defaultIndex = await services.dataViews.getDefault();
        if (defaultIndex) {
          indexes = [defaultIndex];
        }
      }
      if (indexes) {
        setIndexPatterns(indexes);
      }
    };

    asyncSetIndexPattern();
  }, [services.dataViews, vis.data.indexPattern, vis.params, vis.type]);

  /** Synchronizing dataView with state **/
  useEffect(() => {
    const stateContainerSubscription = stateContainer.state$
      .pipe(
        switchMap(async ({ dataView }) => {
          if (
            dataView &&
            visInstance.vis.data.indexPattern &&
            dataView !== visInstance.vis.data.indexPattern.id
          ) {
            const dataViewFromState = await services.dataViews.get(dataView);

            if (dataViewFromState) {
              setIndexPatterns([dataViewFromState]);
            }
          }
        })
      )
      .subscribe();
    return () => {
      stateContainerSubscription.unsubscribe();
    };
  }, [services.dataViews, stateContainer.state$, visInstance.vis.data.indexPattern]);

  useEffect(() => {
    const autoRefreshFetchSub = services.data.query.timefilter.timefilter
      .getAutoRefreshFetch$()
      .pipe(
        switchMap(async (done) => {
          try {
            await doReload();
          } finally {
            done();
          }
        })
      )
      .subscribe();
    return () => {
      autoRefreshFetchSub.unsubscribe();
    };
  }, [services.data.query.timefilter.timefilter, doReload]);

  const shouldShowDataViewPicker = Boolean(
    vis.type.editorConfig?.enableDataViewChange &&
      ((vis.data.indexPattern && !vis.data.savedSearchId) ||
        isFallbackDataView(vis.data.indexPattern)) &&
      indexPatterns.length
  );

  const onChangeDataView = useCallback(
    async (selectedDataViewId: string) => {
      if (selectedDataViewId) {
        stateContainer.transitions.updateDataView(selectedDataViewId);
      }
    },
    [stateContainer.transitions]
  );

  const isMissingCurrentDataView = isFallbackDataView(vis.data.indexPattern);

  return isChromeVisible ? (
    /**
     * Most visualizations have all search bar components enabled.
     * Some visualizations have fewer options, but all visualizations have the search bar.
     * That's is why the showSearchBar prop is set.
     * All visualizations also have the timepicker\autorefresh component,
     * it is enabled by default in the TopNavMenu component.
     */

    <TopNavMenu
      appName={VISUALIZE_APP_NAME}
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
      badges={
        managed
          ? [
              getManagedContentBadge(
                i18n.translate('visualizations.managedBadgeTooltip', {
                  defaultMessage:
                    'This visualization is managed by Elastic. Changes made here must be saved to a new visualization.',
                })
              ),
            ]
          : undefined
      }
      allowSavingQueries
      dataViewPickerComponentProps={
        shouldShowDataViewPicker && vis.data.indexPattern
          ? {
              currentDataViewId: vis.data.indexPattern.id,
              trigger: {
                label: isMissingCurrentDataView
                  ? i18n.translate('visualizations.fallbackDataView.label', {
                      defaultMessage: '{type} not found',
                      values: {
                        type: vis.data.savedSearchId
                          ? i18n.translate('visualizations.search.label', {
                              defaultMessage: 'Search',
                            })
                          : i18n.translate('visualizations.dataView.label', {
                              defaultMessage: 'Data view',
                            }),
                      },
                    })
                  : vis.data.indexPattern.getName(),
              },
              isMissingCurrent: isMissingCurrentDataView,
              onChangeDataView,
            }
          : undefined
      }
      showSearchBar
      useDefaultBehaviors
    />
  ) : showFilterBar ? (
    /**
     * The top nav is hidden in embed mode, but the filter bar must still be present so
     * we show the filter bar on its own here if the chrome is not visible.
     */
    <TopNavMenu
      appName={VISUALIZE_APP_NAME}
      setMenuMountPoint={setHeaderActionMenu}
      indexPatterns={indexPatterns}
      showSearchBar
      showDatePicker={false}
      showQueryInput={false}
    />
  ) : null;
};

export const VisualizeTopNav = injectI18n(memo(TopNav));
