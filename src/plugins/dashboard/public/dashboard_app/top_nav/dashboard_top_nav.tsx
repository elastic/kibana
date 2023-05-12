/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import UseUnmount from 'react-use/lib/useUnmount';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import {
  withSuspense,
  LazyLabsFlyout,
  getContextProvider as getPresentationUtilContextProvider,
} from '@kbn/presentation-util-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { LensSuggestionsApi, Suggestion } from '@kbn/lens-plugin/public';

import {
  type AggregateQuery,
  getIndexPatternFromSQLQuery,
  getIndexPatternFromESQLQuery,
} from '@kbn/es-query';
import {
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFlyoutBody,
  EuiTitle,
  useEuiTheme,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDelayRender,
  EuiButton,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiIcon,
  EuiPanel,
} from '@elastic/eui';
import { EuiHorizontalRule, EuiToolTipProps } from '@elastic/eui';
import {
  getDashboardTitle,
  leaveConfirmStrings,
  getDashboardBreadcrumb,
  unsavedChangesBadgeStrings,
} from '../_dashboard_app_strings';
import { UI_SETTINGS } from '../../../common';
import { useDashboardAPI } from '../dashboard_app';
import { pluginServices } from '../../services/plugin_services';
import { useDashboardMenuItems } from './use_dashboard_menu_items';
import { DashboardEmbedSettings, DashboardRedirect } from '../types';
import { DashboardEditingToolbar } from './dashboard_editing_toolbar';
import { useDashboardMountContext } from '../hooks/dashboard_mount_context';
import { getFullEditPath, LEGACY_DASHBOARD_APP_ID } from '../../dashboard_constants';
import { fetchFieldsFromTextBased } from './fetch_textBased';
import { getLensAttributes } from './get_lens_props';

import './_dashboard_top_nav.scss';
export interface DashboardTopNavProps {
  embedSettings?: DashboardEmbedSettings;
  redirectTo: DashboardRedirect;
}

const LabsFlyout = withSuspense(LazyLabsFlyout, null);

export function DashboardTopNav({ embedSettings, redirectTo }: DashboardTopNavProps) {
  const [isChromeVisible, setIsChromeVisible] = useState(false);
  const [isLabsShown, setIsLabsShown] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [queryTextBased, setQueryTextBased] = useState<AggregateQuery>({
    sql: 'from kibana_sample_data_logs | limit 10',
  });

  const [lensSuggestionsApi, setLensSuggestionsApi] = useState<LensSuggestionsApi>();
  const [suggestions, setSuggestions] = useState<Suggestion[]>();
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion>();
  const [dv, setDv] = useState<DataView>();
  const [defaultDv, setDefaultDv] = useState<DataView | null>();
  const [chartSize, setChartSize] = useState('100%');
  const { euiTheme } = useEuiTheme();
  const chartCss = css`
    position: relative;
    flex-grow: 1;

    & > div {
      height: 100%;
      position: absolute;
      width: 100%;
    }

    & .lnsExpressionRenderer {
      width: ${chartSize};
      height: ${chartSize};
      margin: auto;
    }

    & .echLegend .echLegendList {
      padding-right: ${euiTheme.size.s};
    }

    & > .euiLoadingChart {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  `;
  const dashboardTitleRef = useRef<HTMLHeadingElement>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  /**
   * Unpack dashboard services
   */
  const {
    data: {
      query: { filterManager, timefilter },
      dataViews: dataViewsService,
    },
    chrome: {
      setBreadcrumbs,
      setIsVisible: setChromeVisibility,
      getIsVisible$: getChromeIsVisible$,
      recentlyAccessed: chromeRecentlyAccessed,
    },
    notifications: { toasts },
    settings: { uiSettings },
    navigation: { TopNavMenu },
    embeddable: { getStateTransfer, getEmbeddableFactory },
    initializerContext: { allowByValueEmbeddables },
    dashboardCapabilities: { saveQuery: showSaveQuery },
    lens,
    expressions,
    unifiedSearch,
  } = pluginServices.getServices();
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
  });
  const isLabsEnabled = uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);
  const { setHeaderActionMenu, onAppLeave } = useDashboardMountContext();

  const dashboard = useDashboardAPI();
  const PresentationUtilContextProvider = getPresentationUtilContextProvider();

  const hasUnsavedChanges = dashboard.select((state) => state.componentState.hasUnsavedChanges);
  const fullScreenMode = dashboard.select((state) => state.componentState.fullScreenMode);
  const savedQueryId = dashboard.select((state) => state.componentState.savedQueryId);
  const lastSavedId = dashboard.select((state) => state.componentState.lastSavedId);
  const viewMode = dashboard.select((state) => state.explicitInput.viewMode);
  const query = dashboard.select((state) => state.explicitInput.query);
  const title = dashboard.select((state) => state.explicitInput.title);

  // store data views in state & subscribe to dashboard data view changes.
  const [allDataViews, setAllDataViews] = useState<DataView[]>(dashboard.getAllDataViews());
  useEffect(() => {
    const subscription = dashboard.onDataViewsUpdate$.subscribe((dataViews) =>
      setAllDataViews(dataViews)
    );
    return () => subscription.unsubscribe();
  }, [dashboard]);

  const dashboardTitle = useMemo(() => {
    return getDashboardTitle(title, viewMode, !lastSavedId);
  }, [title, viewMode, lastSavedId]);

  /**
   * focus on the top header when title or view mode is changed
   */
  useEffect(() => {
    dashboardTitleRef.current?.focus();
  }, [title, viewMode]);

  /**
   * Manage chrome visibility when dashboard is embedded.
   */
  useEffect(() => {
    if (!embedSettings) setChromeVisibility(viewMode !== ViewMode.PRINT);
  }, [embedSettings, setChromeVisibility, viewMode]);

  /**
   * populate recently accessed, and set is chrome visible.
   */
  useEffect(() => {
    const subscription = getChromeIsVisible$().subscribe((visible) => setIsChromeVisible(visible));
    if (lastSavedId && title) {
      chromeRecentlyAccessed.add(
        getFullEditPath(lastSavedId, viewMode === ViewMode.EDIT),
        title,
        lastSavedId
      );
    }
    return () => subscription.unsubscribe();
  }, [
    allowByValueEmbeddables,
    chromeRecentlyAccessed,
    getChromeIsVisible$,
    lastSavedId,
    viewMode,
    title,
  ]);

  /**
   * Set breadcrumbs to dashboard title when dashboard's title or view mode changes
   */
  useEffect(() => {
    setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          redirectTo({ destination: 'listing' });
        },
      },
      {
        text: dashboardTitle,
      },
    ]);
  }, [setBreadcrumbs, redirectTo, dashboardTitle]);

  /**
   * Build app leave handler whenever hasUnsavedChanges changes
   */
  useEffect(() => {
    onAppLeave((actions) => {
      if (
        viewMode === ViewMode.EDIT &&
        hasUnsavedChanges &&
        !getStateTransfer().isTransferInProgress
      ) {
        return actions.confirm(
          leaveConfirmStrings.getLeaveSubtitle(),
          leaveConfirmStrings.getLeaveTitle()
        );
      }
      return actions.default();
    });
    return () => {
      // reset on app leave handler so leaving from the listing page doesn't trigger a confirmation
      onAppLeave((actions) => actions.default());
    };
  }, [onAppLeave, getStateTransfer, hasUnsavedChanges, viewMode]);

  useEffect(() => {
    async function getLensApi() {
      const apiHelper = await lens.stateHelperApi();
      setLensSuggestionsApi(() => apiHelper.suggestions);
    }
    if (!lensSuggestionsApi) {
      getLensApi();
    }
  }, [lens, lensSuggestionsApi]);

  useEffect(() => {
    async function getDefaultDataView() {
      const defaultDataview = await dataViewsService.getDefaultDataView();
      setDefaultDv(defaultDataview);
      setQueryTextBased({ esql: `from ${defaultDataview?.title} | limit 10` });
    }
    if (!defaultDv) {
      getDefaultDataView();
    }
  }, [dataViewsService, defaultDv]);

  useEffect(() => {
    async function getColumns() {
      let indexPattern = '';
      // sql queries
      const table = await fetchFieldsFromTextBased(queryTextBased, expressions);
      const columns = table?.columns?.map(({ name }) => name);
      if ('sql' in queryTextBased) {
        indexPattern = getIndexPatternFromSQLQuery(queryTextBased.sql);
      } else {
        indexPattern = getIndexPatternFromESQLQuery(queryTextBased.esql);
      }
      if (indexPattern) {
        const dataView = await dataViewsService.create({
          title: indexPattern,
        });
        const context = {
          dataViewSpec: dataView?.toSpec(),
          fieldName: '',
          contextualFields: columns,
          query: queryTextBased,
        };
        const allSuggestions = lensSuggestionsApi?.(context, dataView) ?? [];

        if (allSuggestions?.[0].visualizationId === 'lnsMetric') {
          setChartSize(`320px`);
        } else {
          setChartSize('100%');
        }
        setDv(dataView);
        setCurrentSuggestion(allSuggestions[0]);
        setSuggestions(allSuggestions);
      }
    }
    if (lensSuggestionsApi) {
      getColumns();
    }
  }, [dataViewsService, expressions, lensSuggestionsApi, queryTextBased]);
  const lensProps = getLensAttributes({
    title: '',
    filters: [],
    query: queryTextBased,
    dataView: dv,
    suggestion: currentSuggestion,
    timefilter,
  });

  const onSaveLens = useCallback(async () => {
    const embeddableFactory = getEmbeddableFactory('lens');
    if (embeddableFactory) {
      try {
        const explicitInput = { attributes: lensProps.attributes };
        const newEmbeddable = await dashboard.addNewEmbeddable('lens', explicitInput);

        if (newEmbeddable) {
          dashboard.setScrollToPanelId(newEmbeddable.id);
          dashboard.setHighlightPanelId(newEmbeddable.id);
          toasts.addSuccess({
            title: 'Your Visualization was successufull added',
            'data-test-subj': 'addEmbeddableToDashboardSuccess',
          });
          setIsFlyoutVisible(false);
        }
      } catch (e) {
        // error likely means user canceled embeddable creation
        return;
      }
    }
  }, [dashboard, getEmbeddableFactory, lensProps.attributes, toasts]);

  const { viewModeTopNavConfig, editModeTopNavConfig } = useDashboardMenuItems({
    redirectTo,
    isLabsShown,
    setIsLabsShown,
  });

  const visibilityProps = useMemo(() => {
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      (forceShow || isChromeVisible) && !fullScreenMode;
    const shouldShowFilterBar = (forceHide: boolean): boolean =>
      !forceHide && (filterManager.getFilters().length > 0 || !fullScreenMode);

    const showTopNavMenu = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowTopNavMenu));
    const showQueryInput = shouldShowNavBarComponent(
      Boolean(embedSettings?.forceShowQueryInput || viewMode === ViewMode.PRINT)
    );
    const showDatePicker = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowDatePicker));
    const showFilterBar = shouldShowFilterBar(Boolean(embedSettings?.forceHideFilterBar));
    const showQueryBar = showQueryInput || showDatePicker || showFilterBar;
    const showSearchBar = showQueryBar || showFilterBar;

    return {
      showTopNavMenu,
      showSearchBar,
      showFilterBar,
      showQueryInput,
      showDatePicker,
    };
  }, [embedSettings, filterManager, fullScreenMode, isChromeVisible, viewMode]);

  UseUnmount(() => {
    dashboard.clearOverlays();
  });

  return (
    <div
      className={classNames('dashboardTopNav', {
        'dashboardTopNav-fullscreenMode': fullScreenMode,
      })}
    >
      <h1
        id="dashboardTitle"
        className="euiScreenReaderOnly"
        ref={dashboardTitleRef}
        tabIndex={-1}
      >{`${getDashboardBreadcrumb()} - ${dashboardTitle}`}</h1>
      <TopNavMenu
        {...visibilityProps}
        query={query}
        screenTitle={title}
        useDefaultBehaviors={true}
        indexPatterns={allDataViews}
        savedQueryId={savedQueryId}
        showSaveQuery={showSaveQuery}
        appName={LEGACY_DASHBOARD_APP_ID}
        visible={viewMode !== ViewMode.PRINT}
        setMenuMountPoint={embedSettings || fullScreenMode ? undefined : setHeaderActionMenu}
        className={fullScreenMode ? 'kbnTopNavMenu-isFullScreen' : undefined}
        config={
          visibilityProps.showTopNavMenu
            ? viewMode === ViewMode.EDIT
              ? editModeTopNavConfig
              : viewModeTopNavConfig
            : undefined
        }
        badges={
          hasUnsavedChanges && viewMode === ViewMode.EDIT
            ? [
                {
                  'data-test-subj': 'dashboardUnsavedChangesBadge',
                  badgeText: unsavedChangesBadgeStrings.getUnsavedChangedBadgeText(),
                  title: '',
                  color: 'warning',
                  toolTipProps: {
                    content: unsavedChangesBadgeStrings.getUnsavedChangedBadgeToolTipContent(),
                    position: 'bottom',
                  } as EuiToolTipProps,
                },
              ]
            : undefined
        }
        onQuerySubmit={(_payload, isUpdate) => {
          if (isUpdate === false) {
            dashboard.forceRefresh();
          }
        }}
        onSavedQueryIdChange={(newId: string | undefined) =>
          dashboard.dispatch.setSavedQueryId(newId)
        }
      />
      {viewMode !== ViewMode.PRINT && isLabsEnabled && isLabsShown ? (
        <PresentationUtilContextProvider>
          <LabsFlyout solutions={['dashboard']} onClose={() => setIsLabsShown(false)} />
        </PresentationUtilContextProvider>
      ) : null}
      {viewMode === ViewMode.EDIT ? (
        <DashboardEditingToolbar setIsFlyoutVisible={setIsFlyoutVisible} />
      ) : null}
      <EuiHorizontalRule margin="none" />
      {isFlyoutVisible && (
        <EuiFlyout
          type="push"
          ownFocus
          ref={chartRef}
          onClose={() => setIsFlyoutVisible(false)}
          aria-labelledby={i18n.translate('dashboard.solutionToolbar.editLabel', {
            defaultMessage: 'Create a chart with ESQL',
          })}
          outsideClickCloses={true}
          size="m"
          css={{ zIndex: 10000 }}
        >
          <EuiFlyoutHeader hasBorder className="lnsDimensionContainer__header">
            <EuiTitle size="xs">
              <h2 id="Edit Lens configuration">
                {i18n.translate('dashboard.solutionToolbar.editLabel', {
                  defaultMessage: 'Create a chart with ESQL',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <KibanaReactContextProvider>
              <unifiedSearch.TextBasedLanguagesEditor
                query={queryTextBased}
                onTextLangQueryChange={(q) => {}}
                expandCodeEditor={(status: boolean) => {}}
                isCodeEditorExpanded={true}
                errors={[]}
                onTextLangQuerySubmit={(q) => {
                  if (q) {
                    setQueryTextBased(q);
                  }
                }}
                isDisabled={false}
              />
            </KibanaReactContextProvider>
            <EuiSpacer size="m" />
            {lensProps && (
              <EuiDelayRender delay={300}>
                <EuiFlexGroup
                  className="eui-fullHeight"
                  alignItems="center"
                  justifyContent="center"
                  gutterSize="none"
                  responsive={false}
                  direction="column"
                >
                  <EuiFlexItem
                    grow={true}
                    css={{ minWidth: '800px', width: 'calc(100% + 2px)', minHeight: '600px' }}
                  >
                    <div data-test-subj="dashESQLChart" css={chartCss}>
                      <lens.EmbeddableComponent {...lensProps} disableTriggers={true} />
                    </div>
                  </EuiFlexItem>
                  {suggestions && suggestions?.length > 1 && (
                    <>
                      <EuiSpacer size="m" />
                      <EuiFlexItem>
                        <EuiFlexGroup
                          responsive={false}
                          alignItems="center"
                          justifyContent="center"
                        >
                          {suggestions.map((s) => (
                            <EuiFlexItem>
                              <div data-test-subj={`lnsSuggestion-${s.title}`}>
                                <EuiPanel
                                  hasBorder={true}
                                  hasShadow={false}
                                  className={classNames('lnsSuggestionPanel__button', {
                                    'lnsSuggestionPanel__button-isSelected':
                                      s.title === currentSuggestion?.title,
                                  })}
                                  paddingSize="none"
                                  data-test-subj="lnsSuggestion"
                                  onClick={() => {
                                    if (s.title !== currentSuggestion?.title) {
                                      setCurrentSuggestion(s);
                                    }
                                  }}
                                  aria-label={s.title}
                                  element="div"
                                  role="listitem"
                                >
                                  <span className="lnsSuggestionPanel__suggestionIcon">
                                    <EuiIcon size="xxl" type={s.previewIcon} />
                                  </span>
                                  <span className="lnsSuggestionPanel__buttonLabel">{s.title}</span>
                                </EuiPanel>
                              </div>
                            </EuiFlexItem>
                          ))}
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </>
                  )}
                </EuiFlexGroup>
              </EuiDelayRender>
            )}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={() => setIsFlyoutVisible(false)}
                  flush="left"
                >
                  <FormattedMessage
                    id="dashboard.esqlTooltbar.closeFlyout"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={onSaveLens}
                  fill
                  isDisabled={!lensProps}
                  data-test-subj="imageEmbeddableEditorSave"
                >
                  <FormattedMessage
                    id="dashboard.esqlTooltbar.saveEmbeddable"
                    defaultMessage="Save and Close"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </div>
  );
}
