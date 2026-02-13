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
  EuiButton,
  type EuiContextMenuPanelDescriptor,
  EuiContextMenuItem,
  EuiContextMenu,
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
import { type RecommendedQuery, REGISTRY_EXTENSIONS_ROUTE } from '@kbn/esql-types';
import { getRecommendedQueriesTemplates } from '@kbn/esql-language/src/commands/registry/options/recommended_queries';
import { LanguageDocumentationFlyout } from '@kbn/language-documentation';
import { getCategorizationField } from '@kbn/aiops-utils';
import { prettifyQueryTemplate } from '@kbn/esql-language/src/commands/registry/options/recommended_queries/utils';
import { ESQLEditorTelemetryService } from '@kbn/esql-editor/src/telemetry/telemetry_service';
import { QuerySource } from '@kbn/esql-types/src/esql_telemetry_types';
import type { IUnifiedSearchPluginServices } from '../types';

export interface ESQLMenuPopoverProps {
  onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
  adHocDataview?: DataView | string;
  onESQLQuerySubmit?: (query: string) => void;
}

export const ESQLMenuPopover: React.FC<ESQLMenuPopoverProps> = ({
  onESQLDocsFlyoutVisibilityChanged,
  adHocDataview,
  onESQLQuerySubmit,
}) => {
  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { docLinks, http, chrome, analytics, notifications } = kibana.services;
  const isFeedbackEnabled = useMemo(() => notifications.feedback.isEnabled(), [notifications]);
  const { euiTheme } = useEuiTheme();

  const activeSolutionId = useObservable(chrome.getActiveSolutionNavId$());
  const [isESQLMenuPopoverOpen, setIsESQLMenuPopoverOpen] = useState(false);
  const [isLanguageComponentOpen, setIsLanguageComponentOpen] = useState(false);

  const [solutionsRecommendedQueries, setSolutionsRecommendedQueries] = useState<
    RecommendedQuery[]
  >([]);

  const telemetryServiceRef = useRef(new ESQLEditorTelemetryService(analytics));

  const { queryForRecommendedQueries, timeFieldName, categorizationField } = useMemo(() => {
    if (adHocDataview && typeof adHocDataview !== 'string') {
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

  // Use a ref to store the *previous* fetched recommended queries
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
          lastFetchedQueries.current = extensions.recommendedQueries; // Update the ref with the new data
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
      onESQLDocsFlyoutVisibilityChanged?.(status);
    },
    [setIsLanguageComponentOpen, onESQLDocsFlyoutVisibilityChanged]
  );

  const esqlContextMenuPanels = useMemo(() => {
    const recommendedQueries = [];
    if (solutionsRecommendedQueries.length && typeof adHocDataview !== 'string') {
      // Construct the full recommended queries by prepending the base 'FROM' command
      // and add them to the main list of recommended queries.

      recommendedQueries.push(
        ...solutionsRecommendedQueries.map((recommendedQuery) => {
          const template = prettifyQueryTemplate(recommendedQuery.query);

          // Check if query starts with FROM or TS
          const startsWithTs = recommendedQuery.query.startsWith('TS');

          // Use the information to conditionally format the query
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
            name: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.quickReference', {
              defaultMessage: 'Quick Reference',
            }),
            icon: 'nedocumentationsted', // Typo: Should be 'documentation'
            renderItem: () => (
              <EuiContextMenuItem
                key="quickReference"
                icon="documentation"
                data-test-subj="esql-quick-reference"
                onClick={() => toggleLanguageComponent()}
              >
                {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.quickReference', {
                  defaultMessage: 'Quick Reference',
                })}
              </EuiContextMenuItem>
            ),
          },
          {
            name: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.documentation', {
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
                {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.documentation', {
                  defaultMessage: 'Documentation',
                })}
              </EuiContextMenuItem>
            ),
          },
          ...(Boolean(recommendedQueries.length)
            ? [
                {
                  name: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.exampleQueries', {
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
                  name: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.feedback', {
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
                      {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.feedback', {
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
        title: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.exampleQueries', {
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
              onESQLQuerySubmit?.(query.queryString);
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
    adHocDataview,
    docLinks.links.query.queryESQL,
    onESQLQuerySubmit,
    queryForRecommendedQueries,
    timeFieldName,
    toggleLanguageComponent,
    solutionsRecommendedQueries, // This dependency is fine here, as it *uses* the state
    categorizationField,
    isFeedbackEnabled,
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
          <EuiButton
            color="text"
            onClick={() => setIsESQLMenuPopoverOpen(!isESQLMenuPopoverOpen)}
            data-test-subj="esql-menu-button"
            size="s"
          >
            {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.label', {
              defaultMessage: 'ES|QL help',
            })}
          </EuiButton>
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
