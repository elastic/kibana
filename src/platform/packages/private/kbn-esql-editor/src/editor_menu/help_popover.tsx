/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
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
import { getEditorExtensions, getSourceCommandQueryFromESQLQuery } from '@kbn/esql-utils';
import { EsqlSource } from '@kbn/data-source';
import {
  type RecommendedQuery,
  type ESQLRegistrySolutionId,
  QuerySource,
  ESQL_CLASSIC_SOLUTION_ID,
} from '@kbn/esql-types';
import { getRecommendedQueriesTemplates } from '@kbn/esql-language/src/commands/registry/options/recommended_queries';
import { LanguageDocumentationFlyout } from '@kbn/language-documentation';
import { getCategorizationField } from '@kbn/aiops-utils';
import { prettifyQueryTemplate } from '@kbn/esql-language/src/commands/registry/options/recommended_queries/utils';
import {
  getEffectiveProjectRouting,
  usePickerProjectRouting,
} from '../hooks/use_effective_project_routing';
import { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
import { reportEsqlError } from '../report_error';
import type { ESQLEditorDeps } from '../types';
import { useEsqlEditorActions } from '../editor_actions_context';
import { helpLabel } from './menu_i18n';

const useHelpMenuPanels = ({
  isOpen,
  hideRecommendedQueries,
  onOpenDocs,
  closeMenu,
}: {
  /** Recommended queries are only derived/fetched while the menu is open */
  isOpen: boolean;
  hideRecommendedQueries?: boolean;
  onOpenDocs: () => void;
  closeMenu: () => void;
}): EuiContextMenuPanelDescriptor[] => {
  const kibana = useKibana<ESQLEditorDeps>();
  const { http, chrome, analytics } = kibana.services.core;

  const actions = useEsqlEditorActions();
  const currentQueryRef = useRef<string>('');
  currentQueryRef.current = actions?.currentQuery ?? '';
  const pickerProjectRouting = usePickerProjectRouting();

  const activeSolutionNavId = useObservable(chrome.getActiveSolutionNavId$());
  const activeSolutionId = activeSolutionNavId ?? ESQL_CLASSIC_SOLUTION_ID;
  const [dataviewDerived, setDataviewDerived] = useState<{
    queryForRecommendedQueries: string;
    timeFieldName: string | undefined;
    categorizationField: string | undefined;
    dataviewName: string | undefined;
  }>({
    queryForRecommendedQueries: '',
    timeFieldName: undefined,
    categorizationField: undefined,
    dataviewName: undefined,
  });

  const [solutionsRecommendedQueries, setSolutionsRecommendedQueries] = useState<
    RecommendedQuery[]
  >([]);

  const telemetryServiceRef = useRef(new ESQLEditorTelemetryService(analytics));

  useEffect(() => {
    let isMounted = true;
    if (!isOpen || hideRecommendedQueries) {
      return () => {
        isMounted = false;
      };
    }

    const resetDataviewDerived = () => {
      setDataviewDerived({
        queryForRecommendedQueries: '',
        timeFieldName: undefined,
        categorizationField: undefined,
        dataviewName: undefined,
      });
    };

    const getDataViewForQuery = async () => {
      const sourceQuery = getSourceCommandQueryFromESQLQuery(currentQueryRef.current);
      if (!sourceQuery) {
        resetDataviewDerived();
        return;
      }
      try {
        const source = await EsqlSource.create({
          query: sourceQuery,
          http,
          projectRouting: getEffectiveProjectRouting(currentQueryRef.current, pickerProjectRouting),
        });
        if (!isMounted) return;
        const columns = source.getColumns();
        const textFields = columns.filter(({ type }) => type === 'string');
        const tempCategorizationField = textFields.length
          ? getCategorizationField(textFields.map(({ name }) => name))
          : undefined;
        setDataviewDerived({
          queryForRecommendedQueries: `FROM ${source.title}`,
          timeFieldName: source.timeFieldName ?? columns.find(({ type }) => type === 'date')?.name,
          categorizationField: tempCategorizationField,
          dataviewName: source.title,
        });
      } catch (error) {
        if (isMounted) {
          resetDataviewDerived();
        }
      }
    };
    getDataViewForQuery();

    return () => {
      isMounted = false;
    };
  }, [http, pickerProjectRouting, isOpen, hideRecommendedQueries]);

  const { queryForRecommendedQueries, timeFieldName, categorizationField, dataviewName } =
    dataviewDerived;

  const lastFetchedQueries = useRef<RecommendedQuery[]>([]);

  useEffect(() => {
    let cancelled = false;
    const getESQLExtensions = async () => {
      if (!activeSolutionId || !queryForRecommendedQueries) {
        return;
      }

      try {
        const query = currentQueryRef.current || queryForRecommendedQueries;
        const extensions = await getEditorExtensions(
          http,
          query,
          activeSolutionId as ESQLRegistrySolutionId
        );

        if (cancelled) return;
        // Only update state if the new data is actually different from the *last successfully set* data
        if (!isEqual(extensions.recommendedQueries, lastFetchedQueries.current)) {
          setSolutionsRecommendedQueries(extensions.recommendedQueries);
          lastFetchedQueries.current = extensions.recommendedQueries;
        }
      } catch (error) {
        reportEsqlError(error, { errorType: 'HelpExtensionsFetch' });
      }
    };

    getESQLExtensions();

    return () => {
      cancelled = true;
    };
  }, [activeSolutionId, http, queryForRecommendedQueries]);

  const esqlContextMenuPanels = useMemo(() => {
    const recommendedQueries = [];
    if (solutionsRecommendedQueries.length) {
      recommendedQueries.push(
        ...solutionsRecommendedQueries.map((recommendedQuery) => {
          // If the query is standalone, return the query string directly
          if (recommendedQuery.isStandalone) {
            return {
              label: recommendedQuery.name,
              queryString: recommendedQuery.query,
            };
          }

          const template = prettifyQueryTemplate(recommendedQuery.query);
          // Check if query starts with FROM or TS
          const startsWithTs = recommendedQuery.query.startsWith('TS');
          const queryString = startsWithTs
            ? `TS ${dataviewName ?? ''} ${template}`
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
              defaultMessage: 'Help',
            }),
            icon: 'documentation',
            renderItem: () => (
              <EuiContextMenuItem
                key="quickReference"
                data-test-subj="esql-quick-reference"
                onClick={() => onOpenDocs()}
              >
                {i18n.translate('esqlEditor.menu.quickReference', {
                  defaultMessage: 'Help',
                })}
              </EuiContextMenuItem>
            ),
          },
          ...(!hideRecommendedQueries && Boolean(recommendedQueries.length)
            ? [
                {
                  name: i18n.translate('esqlEditor.menu.exampleQueries', {
                    defaultMessage: 'Recommended queries',
                  }),
                  panel: 1,
                  'data-test-subj': 'esql-recommended-queries',
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
              closeMenu();
            },
          };
        }),
      },
    ];
    return panels as EuiContextMenuPanelDescriptor[];
  }, [
    actions,
    categorizationField,
    dataviewName,
    hideRecommendedQueries,
    queryForRecommendedQueries,
    solutionsRecommendedQueries,
    timeFieldName,
    onOpenDocs,
    closeMenu,
  ]);
  return esqlContextMenuPanels;
};

export const HelpPopover: React.FC<{
  onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
  /** Size for the docs flyout. Pass a named size when embedded in another flyout. */
  docsFlyoutSize?: EuiFlyoutProps['size'];
  /**
   * Hides the recommended-queries section (and skips deriving it). Use when the embedder
   * can't apply a picked query — i.e. no `submitEsqlQuery` action is wired.
   */
  hideRecommendedQueries?: boolean;
  /**
   * Lets the host own the docs flyout's open state (and render the flyout itself), so it survives
   * this component unmounting, e.g. when the footer switches to its collapsed layout.
   */
  isDocsFlyoutOpen?: boolean;
  onDocsFlyoutOpenChange?: (isOpen: boolean) => void;
}> = ({
  onESQLDocsFlyoutVisibilityChanged,
  docsFlyoutSize,
  hideRecommendedQueries,
  isDocsFlyoutOpen,
  onDocsFlyoutOpenChange,
}) => {
  const kibana = useKibana<ESQLEditorDeps>();
  const { docLinks } = kibana.services.core;

  const { euiTheme } = useEuiTheme();
  const actions = useEsqlEditorActions();
  const [isESQLMenuPopoverOpen, setIsESQLMenuPopoverOpen] = useState(false);
  const isDocsFlyoutControlled = onDocsFlyoutOpenChange !== undefined;
  const [isLocalLanguageComponentOpen, setIsLocalLanguageComponentOpen] = useState(false);
  const isLanguageComponentOpen = isDocsFlyoutControlled
    ? Boolean(isDocsFlyoutOpen)
    : isLocalLanguageComponentOpen;
  const setIsLanguageComponentOpen = isDocsFlyoutControlled
    ? onDocsFlyoutOpenChange
    : setIsLocalLanguageComponentOpen;

  useEffect(() => {
    // when the host owns the flyout it reports its visibility itself
    if (!isDocsFlyoutControlled) {
      onESQLDocsFlyoutVisibilityChanged?.(isLanguageComponentOpen);
    }
  }, [isDocsFlyoutControlled, isLanguageComponentOpen, onESQLDocsFlyoutVisibilityChanged]);

  const toggleLanguageComponent = useCallback(() => {
    if (actions?.editorIsInline) {
      actions.toggleLanguageComponent();
      setIsESQLMenuPopoverOpen(false);
      return;
    }
    setIsLanguageComponentOpen(!isLanguageComponentOpen);
    setIsESQLMenuPopoverOpen(false);
  }, [actions, isLanguageComponentOpen, setIsLanguageComponentOpen]);

  const onHelpMenuVisibilityChange = useCallback(
    (status: boolean) => {
      setIsLanguageComponentOpen(status);
    },
    [setIsLanguageComponentOpen]
  );

  const closeMenu = useCallback(() => setIsESQLMenuPopoverOpen(false), []);
  const esqlContextMenuPanels = useHelpMenuPanels({
    isOpen: isESQLMenuPopoverOpen,
    hideRecommendedQueries,
    onOpenDocs: toggleLanguageComponent,
    closeMenu,
  });

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
        aria-label={helpLabel}
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
      {!actions?.editorIsInline && !isDocsFlyoutControlled && (
        <LanguageDocumentationFlyout
          searchInDescription
          linkToDocumentation={docLinks?.links?.query?.queryESQL ?? ''}
          isHelpMenuOpen={isLanguageComponentOpen}
          onHelpMenuVisibilityChange={onHelpMenuVisibilityChange}
          size={docsFlyoutSize}
        />
      )}
    </>
  );
};

/** The help menu (quick reference + recommended queries), for nesting inside another context menu. */
export const HelpMenuContent: React.FC<{
  hideRecommendedQueries?: boolean;
  onOpenDocs: () => void;
  closeMenu: () => void;
  /** Called with the id of the panel being shown, so the host can hide its own header */
  onPanelChange?: (panelId: string | number) => void;
}> = ({ hideRecommendedQueries, onOpenDocs, closeMenu, onPanelChange }) => {
  const panels = useHelpMenuPanels({
    isOpen: true,
    hideRecommendedQueries,
    onOpenDocs,
    closeMenu,
  });
  return (
    <EuiContextMenu
      initialPanelId={0}
      panels={panels}
      onPanelChange={({ panelId }) => onPanelChange?.(panelId)}
      data-test-subj="esql-help-menu"
    />
  );
};

/**
 * Docs flyout for hosts that own the open state (e.g. the collapsed footer menu, whose popover
 * unmounts the help menu when it closes).
 */
export const HelpDocsFlyout: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
  docsFlyoutSize?: EuiFlyoutProps['size'];
}> = ({ isOpen, onOpenChange, onESQLDocsFlyoutVisibilityChanged, docsFlyoutSize }) => {
  const { docLinks } = useKibana<ESQLEditorDeps>().services.core;
  useEffect(() => {
    onESQLDocsFlyoutVisibilityChanged?.(isOpen);
  }, [isOpen, onESQLDocsFlyoutVisibilityChanged]);
  return (
    <LanguageDocumentationFlyout
      searchInDescription
      linkToDocumentation={docLinks?.links?.query?.queryESQL ?? ''}
      isHelpMenuOpen={isOpen}
      onHelpMenuVisibilityChange={onOpenChange}
      size={docsFlyoutSize}
    />
  );
};
