/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  EuiPopover,
  EuiButtonIcon,
  type EuiContextMenuPanelDescriptor,
  EuiContextMenuItem,
  EuiContextMenu,
  EuiToolTip,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { FEEDBACK_LINK } from '@kbn/esql-utils';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { type RecommendedQuery, REGISTRY_EXTENSIONS_ROUTE, QuerySource } from '@kbn/esql-types';
import { getRecommendedQueriesTemplates } from '@kbn/esql-language/src/commands/registry/options/recommended_queries';
import { LanguageDocumentationFlyout } from '@kbn/language-documentation';
import { getCategorizationField } from '@kbn/aiops-utils';
import { prettifyQueryTemplate } from '@kbn/esql-language/src/commands/registry/options/recommended_queries/utils';
import { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
import type { ESQLEditorDeps } from '../types';
import { useEsqlEditorActions } from '../editor_actions_context';
import { helpLabel } from './menu_i18n';

export const HelpPopover: React.FC = () => {
  const kibana = useKibana<ESQLEditorDeps>();
  const { core, data } = kibana.services;
  const { docLinks, http, chrome, analytics, notifications } = core;
  const isFeedbackEnabled = useMemo(
    () => notifications?.feedback?.isEnabled?.() ?? false,
    [notifications]
  );
  const { euiTheme } = useEuiTheme();
  const actions = useEsqlEditorActions();

  const activeSolutionId = useObservable(chrome.getActiveSolutionNavId$());
  const [isESQLMenuPopoverOpen, setIsESQLMenuPopoverOpen] = useState(false);
  const [isLanguageComponentOpen, setIsLanguageComponentOpen] = useState(false);
  const [adHocDataview, setAdHocDataview] = useState<DataView | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.dispatchEvent(
      new CustomEvent('esqlDocsFlyoutVisibilityChange', {
        detail: { isOpen: isLanguageComponentOpen },
      })
    );
  }, [isLanguageComponentOpen]);

  const [solutionsRecommendedQueries, setSolutionsRecommendedQueries] = useState<
    RecommendedQuery[]
  >([]);

  const telemetryServiceRef = useRef(new ESQLEditorTelemetryService(analytics));

  useEffect(() => {
    let isMounted = true;
    const getDataViewForQuery = async () => {
      if (!actions?.currentQuery) {
        setAdHocDataview(undefined);
        return;
      }
      try {
        const dataView = await getESQLAdHocDataview({
          dataViewsService: data.dataViews,
          query: actions.currentQuery,
          http,
        });
        if (isMounted) {
          setAdHocDataview(dataView);
        }
      } catch (error) {
        if (isMounted) {
          setAdHocDataview(undefined);
        }
      }
    };

    getDataViewForQuery();

    return () => {
      isMounted = false;
    };
  }, [actions?.currentQuery, data.dataViews, http]);

  const { queryForRecommendedQueries, timeFieldName, categorizationField } = useMemo(() => {
    if (adHocDataview) {
      const textFields = adHocDataview.fields?.getByType('string') ?? [];
      let tempCategorizationField;
      if (textFields.length) {
        tempCategorizationField = getCategorizationField(textFields.map((field) => field.name));
      }

      return {
        queryForRecommendedQueries: `FROM ${adHocDataview.name}`,
        timeFieldName:
          adHocDataview.timeFieldName ?? adHocDataview.fields?.getByType('date')?.[0]?.name,
        categorizationField: tempCategorizationField,
      };
    }
    return {
      queryForRecommendedQueries: '',
      timeFieldName: undefined,
      categorizationField: undefined,
    };
  }, [adHocDataview]);

  const lastFetchedQueries = useRef<RecommendedQuery[]>([]);

  useEffect(() => {
    let cancelled = false;
    const getESQLExtensions = async () => {
      if (!activeSolutionId || !queryForRecommendedQueries) {
        return; // Don't fetch if we don't have the active solution or query
      }

      try {
        const extensions: { recommendedQueries: RecommendedQuery[] } = await http.get(
          `${REGISTRY_EXTENSIONS_ROUTE}${activeSolutionId}/${queryForRecommendedQueries}`
        );

        if (cancelled) return;
        // Only update state if the new data is actually different from the *last successfully set* data
        if (!isEqual(extensions.recommendedQueries, lastFetchedQueries.current)) {
          setSolutionsRecommendedQueries(extensions.recommendedQueries);
          lastFetchedQueries.current = extensions.recommendedQueries;
        }
      } catch (error) {
        // Do nothing if the extensions are not available
      }
    };

    getESQLExtensions();

    return () => {
      cancelled = true;
    };
  }, [activeSolutionId, http, queryForRecommendedQueries]);

  const toggleLanguageComponent = useCallback(() => {
    setIsLanguageComponentOpen(!isLanguageComponentOpen);
    setIsESQLMenuPopoverOpen(false);
  }, [isLanguageComponentOpen]);

  const onHelpMenuVisibilityChange = useCallback(
    (status: boolean) => {
      setIsLanguageComponentOpen(status);
    },
    [setIsLanguageComponentOpen]
  );

  const esqlContextMenuPanels = useMemo(() => {
    const recommendedQueries = [];
    if (solutionsRecommendedQueries.length) {
      recommendedQueries.push(
        ...solutionsRecommendedQueries.map((recommendedQuery) => {
          const template = prettifyQueryTemplate(recommendedQuery.query);
          // Check if query starts with FROM or TS
          const startsWithTs = recommendedQuery.query.startsWith('TS');
          const queryString = startsWithTs
            ? `TS ${adHocDataview?.name} ${template}`
            : `${queryForRecommendedQueries} ${template}`;

          return {
            label: recommendedQuery.name,
            queryString,
          };
        })
      );
    }
    // Handle the static recommended queries, no solutions specific
    if (queryForRecommendedQueries && timeFieldName) {
      const recommendedQueriesFromStaticTemplates = getRecommendedQueriesTemplates({
        fromCommand: queryForRecommendedQueries,
        timeField: timeFieldName,
        categorizationField,
      });

      recommendedQueries.push(...recommendedQueriesFromStaticTemplates);
    }
    const panels = [
      {
        id: 0,
        items: [
          {
            name: i18n.translate('esqlEditor.menu.quickReference', {
              defaultMessage: 'Quick Reference',
            }),
            icon: 'documentation',
            renderItem: () => (
              <EuiContextMenuItem
                key="quickReference"
                icon="documentation"
                data-test-subj="esql-quick-reference"
                onClick={() => toggleLanguageComponent()}
              >
                {i18n.translate('esqlEditor.menu.quickReference', {
                  defaultMessage: 'Quick Reference',
                })}
              </EuiContextMenuItem>
            ),
          },
          {
            name: i18n.translate('esqlEditor.menu.documentation', {
              defaultMessage: 'Documentation',
            }),
            icon: 'info',
            renderItem: () => (
              <EuiContextMenuItem
                key="about"
                icon="info"
                data-test-subj="esql-about"
                target="_blank"
                href={docLinks.links.query.queryESQL}
                onClick={() => setIsESQLMenuPopoverOpen(false)}
              >
                {i18n.translate('esqlEditor.menu.documentation', {
                  defaultMessage: 'Documentation',
                })}
              </EuiContextMenuItem>
            ),
          },
          ...(Boolean(recommendedQueries.length)
            ? [
                {
                  name: i18n.translate('esqlEditor.menu.exampleQueries', {
                    defaultMessage: 'Recommended queries',
                  }),
                  icon: 'nested',
                  panel: 1,
                  'data-test-subj': 'esql-recommended-queries',
                },
              ]
            : []),
          ...(isFeedbackEnabled
            ? [
                {
                  name: i18n.translate('esqlEditor.menu.feedback', {
                    defaultMessage: 'Submit feedback',
                  }),
                  icon: 'editorComment',
                  renderItem: () => (
                    <EuiContextMenuItem
                      key="feedback"
                      icon="editorComment"
                      data-test-subj="esql-feedback"
                      target="_blank"
                      href={FEEDBACK_LINK}
                      onClick={() => setIsESQLMenuPopoverOpen(false)}
                    >
                      {i18n.translate('esqlEditor.menu.feedback', {
                        defaultMessage: 'Submit feedback',
                      })}
                    </EuiContextMenuItem>
                  ),
                },
              ]
            : []),
        ],
      },
      {
        id: 1,
        title: i18n.translate('esqlEditor.menu.exampleQueries', {
          defaultMessage: 'Recommended queries',
        }),
        items: recommendedQueries.map((query) => {
          return {
            name: query.label,
            onClick: () => {
              telemetryServiceRef.current.trackRecommendedQueryClicked(
                QuerySource.HELP,
                query.label
              );
              actions?.submitEsqlQuery?.(query.queryString);
              telemetryServiceRef.current.trackQuerySubmitted({
                source: QuerySource.HELP,
                query: query.queryString,
              });
              setIsESQLMenuPopoverOpen(false);
            },
          };
        }),
      },
    ];
    return panels as EuiContextMenuPanelDescriptor[];
  }, [
    actions,
    adHocDataview?.name,
    categorizationField,
    docLinks.links.query.queryESQL,
    isFeedbackEnabled,
    queryForRecommendedQueries,
    solutionsRecommendedQueries,
    timeFieldName,
    toggleLanguageComponent,
  ]);

  const esqlMenuPopoverStyles = css`
    width: 240px;
    padding: ${euiTheme.size.s};
    max-height: 350px;
    overflow-y: auto;
    ${useEuiScrollBar()};
  `;

  return (
    <>
      <EuiPopover
        button={
          <EuiToolTip position="top" content={helpLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              color="text"
              onClick={() => setIsESQLMenuPopoverOpen(!isESQLMenuPopoverOpen)}
              data-test-subj="esql-help-popover-button"
              size="xs"
              iconType="question"
              aria-label={helpLabel}
            />
          </EuiToolTip>
        }
        panelProps={{
          ['data-test-subj']: 'esql-menu-popover',
        }}
        isOpen={isESQLMenuPopoverOpen}
        closePopover={() => setIsESQLMenuPopoverOpen(false)}
        panelPaddingSize="none"
        display="block"
      >
        <div css={esqlMenuPopoverStyles}>
          <EuiContextMenu initialPanelId={0} panels={esqlContextMenuPanels} />
        </div>
      </EuiPopover>
      <LanguageDocumentationFlyout
        searchInDescription
        linkToDocumentation={docLinks?.links?.query?.queryESQL ?? ''}
        isHelpMenuOpen={isLanguageComponentOpen}
        onHelpMenuVisibilityChange={onHelpMenuVisibilityChange}
      />
    </>
  );
};
