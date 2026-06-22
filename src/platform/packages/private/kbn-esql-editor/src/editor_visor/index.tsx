/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiComboBoxOptionOption,
  useEuiTheme,
} from '@elastic/eui';
import { getIndexPatternFromESQLQuery, getESQLAdHocDataview } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import { isEqual } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SourcesDropdown } from './sources_dropdown';
import { visorStyles, visorWidthPercentage, dropdownWidthPercentage } from './visor.styles';
import type { ESQLEditorDeps } from '../types';
import { useNlToEsqlCheck } from '../hooks/use_nl_to_esql_check';
import { reportEsqlError } from '../report_error';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';

export interface QuickSearchVisorProps {
  // Current ESQL query
  query: string;
  // Handling smaller space for the visor
  isSpaceReduced?: boolean;
  // Whether the visor is rendered inside an inline editor (uses shorter placeholders)
  isInline?: boolean;
  // Called with the LLM-generated ES|QL so the parent editor can show the diff review UI
  onNlResult?: (generatedQuery: string) => void;
  // Callback when the query is updated and submitted
  onUpdateAndSubmitQuery: (query: string) => void;
  telemetryService?: ESQLEditorTelemetryService;
}

export const searchPlaceholder = i18n.translate('esqlEditor.visor.searchPlaceholder', {
  defaultMessage: 'Filter your data using KQL',
});

const searchPlaceholderWithAi = i18n.translate('esqlEditor.visor.searchPlaceholderWithAi', {
  defaultMessage: 'Filter using KQL or ask AI...',
});

const searchPlaceholderShort = i18n.translate('esqlEditor.visor.searchPlaceholderShort', {
  defaultMessage: 'Filter using KQL',
});

const askAiLabel = i18n.translate('esqlEditor.visor.askAiLabel', {
  defaultMessage: 'or ask using AI',
});

const generatingLabel = i18n.translate('esqlEditor.visor.generatingLabel', {
  defaultMessage: 'Generating...',
});

const stopLabel = i18n.translate('esqlEditor.visor.stopLabel', {
  defaultMessage: 'Stop',
});

export function QuickSearchVisor({
  query,
  isSpaceReduced,
  isInline,
  onNlResult,
  onUpdateAndSubmitQuery,
  telemetryService,
}: QuickSearchVisorProps) {
  const kibana = useKibana<ESQLEditorDeps>();
  const { kql, core, data } = kibana.services;
  const isNlToEsqlEnabled = useNlToEsqlCheck();
  const euiThemeContext = useEuiTheme();
  const useShortPlaceholder = useMemo(() => isInline || isSpaceReduced, [isInline, isSpaceReduced]);
  const [selectedSources, setSelectedSources] = useState<EuiComboBoxOptionOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [isNlLoading, setIsNlLoading] = useState(false);
  const [hasConnector, setHasConnector] = useState<boolean | undefined>(undefined);
  const [adHocDataView, setAdHocDataView] = useState<DataView | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);
  const userSelectedSourceRef = useRef(false);
  const KQLComponent = kql.autocomplete.hasQuerySuggestions('kuery') ? kql.QueryStringInput : null;

  const onKqlValueChange = useCallback((kqlQuery: string) => {
    setSearchValue(kqlQuery);
  }, []);

  const onKqlSubmit = useCallback(
    (kqlQuery: string) => {
      if (selectedSources.length > 0 && kqlQuery.trim()) {
        const selectedSourceNames = selectedSources.map((source) => source.label).join(', ');
        if (selectedSourceNames && kqlQuery.trim()) {
          // Support of time_series
          const sourceCommand = query.trim().toUpperCase().startsWith('TS ') ? 'TS' : 'FROM';
          const newQuery = `${sourceCommand} ${selectedSourceNames} | WHERE KQL("""${kqlQuery.trim()}""")`;
          onUpdateAndSubmitQuery(newQuery);
          setSearchValue('');
          userSelectedSourceRef.current = false;
        }
      }
    },
    [selectedSources, query, onUpdateAndSubmitQuery]
  );

  const trackNlResult = useCallback(
    (
      nlLength: number,
      contextQueryLength: number,
      startTime: number,
      success: boolean,
      errorCode?: string,
      generatedQueryLength?: number
    ) =>
      telemetryService?.trackVisorNlSubmitted({
        nlLength,
        contextQueryLength,
        success,
        durationMs: Date.now() - startTime,
        ...(errorCode ? { errorCode } : {}),
        ...(generatedQueryLength !== undefined ? { generatedQueryLength } : {}),
      }),
    [telemetryService]
  );

  const onAskAiClick = useCallback(async () => {
    if (isNlLoading) return;

    const trimmed = searchValue.trim();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsNlLoading(true);
    const startTime = Date.now();
    try {
      const result = await core.http.post<{ content: string }>(NL_TO_ESQL_ROUTE, {
        body: JSON.stringify({
          nlInstruction: trimmed,
          currentQuery: query,
        }),
        signal: abortController.signal,
      });
      if (result.content) {
        trackNlResult(
          trimmed.length,
          query.length,
          startTime,
          true,
          undefined,
          result.content.length
        );
        if (onNlResult) {
          onNlResult(result.content);
        } else {
          onUpdateAndSubmitQuery(result.content);
        }
      }
    } catch (error) {
      if (abortController.signal.aborted) return;
      reportEsqlError(error, { errorType: 'NlToEsql' });
      const errorCode = String(
        (error as { body?: { statusCode?: number } })?.body?.statusCode ?? ''
      );
      trackNlResult(trimmed.length, query.length, startTime, false, errorCode || undefined);
      const message =
        (error as { body?: { message?: string } })?.body?.message ??
        i18n.translate('esqlEditor.visor.nlError', {
          defaultMessage: 'Failed to generate ES|QL query',
        });
      core.notifications.toasts.addDanger({ title: message });
    } finally {
      setSearchValue('');
      if (!abortController.signal.aborted) {
        setIsNlLoading(false);
      }
    }
  }, [
    isNlLoading,
    searchValue,
    query,
    core.http,
    core.notifications.toasts,
    onNlResult,
    onUpdateAndSubmitQuery,
    trackNlResult,
  ]);

  const onStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsNlLoading(false);
    setSearchValue('');
  }, []);

  useEffect(() => {
    if (!isNlToEsqlEnabled) return;
    core.http
      .get<{ connectors: unknown[] }>('/internal/inference/connectors')
      .then((res) => setHasConnector(res.connectors.length > 0))
      .catch(() => setHasConnector(false));
  }, [isNlToEsqlEnabled, core.http]);

  useEffect(() => {
    const sourceFromUpdatedQuery = getIndexPatternFromESQLQuery(query);
    const sources = sourceFromUpdatedQuery
      ? sourceFromUpdatedQuery.split(',').map((source) => ({ label: source.trim() }))
      : [];
    if (!initializedRef.current) {
      if (sources.length > 0) {
        setSelectedSources(sources);
      }
      setSearchValue('');
      initializedRef.current = true;
    } else if (sources.length > 0 && !userSelectedSourceRef.current) {
      if (!isEqual(selectedSources, sources)) {
        setSelectedSources(sources);
      }
    }
  }, [query, selectedSources]);

  const sourcesKey = useMemo(
    () => selectedSources.map((source) => source.label).join(', '),
    [selectedSources]
  );

  useEffect(() => {
    if (!sourcesKey) {
      setAdHocDataView(null);
      return;
    }
    let cancelled = false;
    getESQLAdHocDataview({
      dataViewsService: data.dataViews,
      query: `FROM ${sourcesKey}`,
      options: { idPrefix: 'esql-visor' },
    }).then((dataView) => {
      if (!cancelled) {
        setAdHocDataView(dataView);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sourcesKey, data.dataViews]);

  const comboBoxWidth = useMemo(() => {
    const labelLength = selectedSources.map((s) => s.label).join(', ').length || 0;
    const maxComboBoxWidth = window.innerWidth * visorWidthPercentage * dropdownWidthPercentage;
    return calculateWidthFromCharCount(labelLength, { maxWidth: maxComboBoxWidth });
  }, [selectedSources]);

  const styles = visorStyles(
    euiThemeContext,
    comboBoxWidth,
    Boolean(isSpaceReduced),
    Boolean(isInline)
  );

  if (!KQLComponent) {
    return null;
  }

  const showFooterOption =
    isNlToEsqlEnabled && hasConnector === true && searchValue.trim().length > 0;
  const footerOption = showFooterOption
    ? { label: askAiLabel, iconType: 'productAgent' as const, onClick: onAskAiClick }
    : undefined;

  return (
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      justifyContent="center"
      responsive={false}
      css={styles.visorContainer}
      data-test-subj="ESQLEditor-quick-search-visor"
    >
      <EuiFlexItem css={styles.visorWrapper}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
          css={styles.visorBox}
        >
          <EuiFlexItem grow={false} css={styles.comboBoxWrapper}>
            <SourcesDropdown
              currentSources={selectedSources.map((source) => source.label)}
              isDisabled={isNlLoading}
              onChangeSources={(newSources) => {
                setSelectedSources(newSources.map((source) => ({ label: source })));
                userSelectedSourceRef.current = true;
              }}
            />
          </EuiFlexItem>
          {!isInline && <EuiFlexItem grow={false} css={styles.separator} />}

          <EuiFlexItem css={styles.searchWrapper}>
            <EuiFlexGroup
              gutterSize="none"
              alignItems="center"
              responsive={false}
              css={styles.searchInner}
            >
              <EuiFlexItem>
                <KQLComponent
                  iconType=""
                  disableLanguageSwitcher={true}
                  indexPatterns={adHocDataView ? [adHocDataView] : []}
                  bubbleSubmitEvent={false}
                  query={{
                    query: searchValue,
                    language: 'kuery',
                  }}
                  disableAutoFocus={true}
                  placeholder={
                    isNlToEsqlEnabled
                      ? searchPlaceholderWithAi
                      : useShortPlaceholder
                      ? searchPlaceholderShort
                      : searchPlaceholder
                  }
                  onChange={(newQuery) => {
                    onKqlValueChange(newQuery.query as string);
                  }}
                  onSubmit={(newQuery) => {
                    onKqlSubmit(newQuery.query as string);
                  }}
                  appName="esqlEditorVisor"
                  dataTestSubj="esqlVisorKQLQueryInput"
                  size="s"
                  footerOption={footerOption}
                  isClearable={false}
                />
              </EuiFlexItem>
              {isNlLoading && (
                <EuiFlexItem grow={false} css={styles.submitButtonWrapper}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {generatingLabel}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge
                        color="hollow"
                        iconType="stop"
                        iconSide="left"
                        onClick={onStopGeneration}
                        onClickAriaLabel={stopLabel}
                        data-test-subj="esqlVisorStopGeneration"
                      >
                        {stopLabel}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
