/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { type AggregateQuery, getIndexPatternFromSQLQuery } from '@kbn/es-query';

import { METRIC_TYPE } from '@kbn/analytics';
import {
  IconType,
  useEuiTheme,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useResizeObserver,
} from '@elastic/eui';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { LensSuggestionsApi, Suggestion } from '@kbn/lens-plugin/public';
import {
  AddFromLibraryButton,
  IconButton,
  IconButtonGroup,
  Toolbar,
  ToolbarButton,
} from '@kbn/shared-ux-button-toolbar';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import {
  getCreateVisualizationButtonTitle,
  getQuickCreateButtonGroupLegend,
} from '../_dashboard_app_strings';
import { EditorMenu } from './editor_menu';
import { useDashboardAPI } from '../dashboard_app';
import { pluginServices } from '../../services/plugin_services';
import { ControlsToolbarButton } from './controls_toolbar_button';
import { DASHBOARD_APP_ID, DASHBOARD_UI_METRIC_ID } from '../../dashboard_constants';
import { dashboardReplacePanelActionStrings } from '../../dashboard_actions/_dashboard_actions_strings';
import { fetchFieldsFromTextBased } from './fetch_textBased';
import { getLensAttributes } from './get_lens_props';

export function DashboardEditingToolbar() {
  const {
    usageCollection,
    data: { search, dataViews, query },
    notifications: { toasts },
    embeddable: { getStateTransfer, getEmbeddableFactory },
    visualizations: { get: getVisualization, getAliases: getVisTypeAliases },
    unifiedSearch,
    settings,
    lens,
    expressions,
  } = pluginServices.getServices();

  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings: settings?.uiSettings,
  });
  const { euiTheme } = useEuiTheme();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [lensSuggestionsApi, setLensSuggestionsApi] = useState<LensSuggestionsApi>();
  const [suggestions, setSuggestions] = useState<Suggestion[]>();
  const [dv, setDv] = useState<DataView>();
  const [chartSize, setChartSize] = useState('100%');
  const [queryTextBased, setQueryTextBased] = useState<AggregateQuery>({
    sql: 'SELECT * FROM kibana_sample_data_logs',
  });
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
  const dashboard = useDashboardAPI();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const { height: containerHeight, width: containerWidth } = useResizeObserver(chartRef.current);

  useEffect(() => {
    async function getLensApi() {
      const apiHelper = await lens.stateHelperApi();
      setLensSuggestionsApi(() => apiHelper.suggestions);
    }
    getLensApi();
  }, [lens]);
  useEffect(() => {
    async function getColumns() {
      let indexPattern = '';
      // sql queries
      const table = await fetchFieldsFromTextBased(queryTextBased, expressions);
      const columns = table?.columns?.map(({ name }) => name);
      if ('sql' in queryTextBased) {
        indexPattern = getIndexPatternFromSQLQuery(queryTextBased.sql);
      }
      if (indexPattern) {
        const dataView = await dataViews.create({
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
          const size = containerHeight < containerWidth ? containerHeight : containerWidth;
          setChartSize(`${size}px`);
        } else {
          setChartSize('100%');
        }
        setDv(dataView);
        setSuggestions(allSuggestions);
      }
    }
    if (lensSuggestionsApi) {
      getColumns();
    }
  }, [containerHeight, containerWidth, dataViews, expressions, lensSuggestionsApi, queryTextBased]);
  const lensProps = getLensAttributes({
    title: '',
    filters: [],
    query: queryTextBased,
    dataView: dv,
    suggestion: suggestions?.[0],
    queryService: query,
  });

  const stateTransferService = getStateTransfer();

  const lensAlias = getVisTypeAliases().find(({ name }) => name === 'lens');
  const quickButtonVisTypes: Array<
    { type: 'vis'; visType: string } | { type: 'embeddable'; embeddableType: string }
  > = [
    { type: 'vis', visType: 'markdown' },
    { type: 'embeddable', embeddableType: 'image' },
    { type: 'vis', visType: 'maps' },
  ];

  const trackUiMetric = usageCollection.reportUiCounter?.bind(
    usageCollection,
    DASHBOARD_UI_METRIC_ID
  );

  const createNewVisType = useCallback(
    (visType?: BaseVisType | VisTypeAlias) => () => {
      let path = '';
      let appId = '';

      if (visType) {
        if (trackUiMetric) {
          trackUiMetric(METRIC_TYPE.CLICK, `${visType.name}:create`);
        }

        if ('aliasPath' in visType) {
          appId = visType.aliasApp;
          path = visType.aliasPath;
        } else {
          appId = 'visualize';
          path = `#/create?type=${encodeURIComponent(visType.name)}`;
        }
      } else {
        appId = 'visualize';
        path = '#/create?';
      }

      stateTransferService.navigateToEditor(appId, {
        path,
        state: {
          originatingApp: DASHBOARD_APP_ID,
          searchSessionId: search.session.getSessionId(),
        },
      });
    },
    [stateTransferService, search.session, trackUiMetric]
  );

  const openESQLFlyout = useCallback(
    () => () => {
      setIsFlyoutVisible(true);
    },
    []
  );

  const createNewEmbeddable = useCallback(
    async (embeddableFactory: EmbeddableFactory) => {
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, embeddableFactory.type);
      }

      let explicitInput: Awaited<ReturnType<typeof embeddableFactory.getExplicitInput>>;
      try {
        explicitInput = await embeddableFactory.getExplicitInput();
      } catch (e) {
        // error likely means user canceled embeddable creation
        return;
      }

      const newEmbeddable = await dashboard.addNewEmbeddable(embeddableFactory.type, explicitInput);

      if (newEmbeddable) {
        dashboard.setScrollToPanelId(newEmbeddable.id);
        dashboard.setHighlightPanelId(newEmbeddable.id);
        toasts.addSuccess({
          title: dashboardReplacePanelActionStrings.getSuccessMessage(newEmbeddable.getTitle()),
          'data-test-subj': 'addEmbeddableToDashboardSuccess',
        });
      }
    },
    [trackUiMetric, dashboard, toasts]
  );

  const getVisTypeQuickButton = (
    quickButtonForType: typeof quickButtonVisTypes[0]
  ): IconButton | undefined => {
    if (quickButtonForType.type === 'vis') {
      const visTypeName = quickButtonForType.visType;
      const visType =
        getVisualization(visTypeName) ||
        getVisTypeAliases().find(({ name }) => name === visTypeName);

      if (visType) {
        if ('aliasPath' in visType) {
          const { name, icon, title } = visType as VisTypeAlias;
          return {
            label: title,
            iconType: icon,
            onClick: createNewVisType(visType as VisTypeAlias),
            'data-test-subj': `dashboardQuickButton${name}`,
          };
        } else {
          const { name, icon, title, titleInWizard } = visType as BaseVisType & { icon: IconType };
          return {
            label: titleInWizard || title,
            iconType: icon,
            onClick: createNewVisType(visType as BaseVisType),
            'data-test-subj': `dashboardQuickButton${name}`,
          };
        }
      }
    } else {
      const embeddableType = quickButtonForType.embeddableType;
      const embeddableFactory = getEmbeddableFactory(embeddableType);
      if (embeddableFactory) {
        return {
          label: embeddableFactory.getDisplayName(),
          iconType: embeddableFactory.getIconType(),
          onClick: () => {
            if (embeddableFactory) {
              createNewEmbeddable(embeddableFactory);
            }
          },
          'data-test-subj': `dashboardQuickButton${embeddableType}`,
        };
      }
    }
  };

  const quickButtons: IconButton[] = quickButtonVisTypes.reduce((accumulator, type) => {
    const button = getVisTypeQuickButton(type);
    return button ? [...accumulator, button] : accumulator;
  }, [] as IconButton[]);

  const extraButtons = [
    <EditorMenu createNewVisType={createNewVisType} createNewEmbeddable={createNewEmbeddable} />,
    <AddFromLibraryButton
      onClick={() => dashboard.addFromLibrary()}
      data-test-subj="dashboardAddPanelButton"
    />,
  ];
  if (dashboard.controlGroup) {
    extraButtons.push(<ControlsToolbarButton controlGroup={dashboard.controlGroup} />);
  }

  return (
    <div
      css={css`
        padding: 0 ${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.s};
      `}
    >
      <Toolbar>
        {{
          primaryButton: (
            <ToolbarButton
              type="primary"
              iconType="lensApp"
              onClick={createNewVisType(lensAlias)}
              label={getCreateVisualizationButtonTitle()}
              data-test-subj="dashboardAddNewPanelButton"
            />
          ),
          secondButton: (
            <ToolbarButton
              type="primary"
              iconType="lensApp"
              onClick={openESQLFlyout()}
              label="Create visualization from ESQL"
              data-test-subj="dashboardAddFromESQL"
            />
          ),
          iconButtonGroup: (
            <IconButtonGroup buttons={quickButtons} legend={getQuickCreateButtonGroupLegend()} />
          ),
          extraButtons,
        }}
      </Toolbar>
      {isFlyoutVisible && (
        <EuiFlyout
          type="push"
          ownFocus
          onClose={() => setIsFlyoutVisible(false)}
          aria-labelledby={i18n.translate('dashboard.solutionToolbar.editLabel', {
            defaultMessage: 'Create a chart with ESQL',
          })}
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
                onTextLangQueryChange={(q) => {
                  setQueryTextBased(q);
                }}
                expandCodeEditor={(status: boolean) => {}}
                isCodeEditorExpanded={true}
                errors={[]}
                onTextLangQuerySubmit={() => {}}
                isDisabled={false}
              />
            </KibanaReactContextProvider>
            {/* {lensProps && (
              <div data-test-subj="unifiedHistogramChart" css={chartCss} ref={chartRef}>
                <lens.EmbeddableComponent {...lensProps} disableTriggers={true} />
              </div>
            )} */}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </div>
  );
}
