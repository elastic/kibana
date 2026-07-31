/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
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
import { VisorMode } from './visor_mode';
import {
  searchPlaceholder,
  nlPlaceholder,
  generatingLabel,
  stopLabel,
  askAiLabel,
  backToKqlLabel,
  enterHintFilterLabel,
  enterHintGenerateLabel,
  nlErrorMessage,
} from './visor_i18n';
import { NLInput } from './nl_input';
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
  const [selectedSources, setSelectedSources] = useState<EuiComboBoxOptionOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [visorMode, setVisorMode] = useState<VisorMode>(VisorMode.KQL);
  const [nlValue, setNlValue] = useState('');
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

  const onStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsNlLoading(false);
    setNlValue('');
  }, []);

  const onNlSubmit = useCallback(async () => {
    const trimmed = nlValue.trim();
    if (!trimmed || isNlLoading) return;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsNlLoading(true);
    const startTime = Date.now();
    try {
      const result = await core.http.post<{ content: string }>(NL_TO_ESQL_ROUTE, {
        body: JSON.stringify({ nlInstruction: trimmed, currentQuery: query }),
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
      const message = (error as { body?: { message?: string } })?.body?.message ?? nlErrorMessage;
      core.notifications.toasts.addDanger({ title: message });
    } finally {
      setNlValue('');
      if (!abortController.signal.aborted) {
        setIsNlLoading(false);
      }
    }
  }, [
    nlValue,
    isNlLoading,
    query,
    core.http,
    core.notifications.toasts,
    onNlResult,
    onUpdateAndSubmitQuery,
    trackNlResult,
  ]);

  const onAskAiClick = useCallback(() => {
    setVisorMode(VisorMode.NaturalLanguage);
  }, []);

  const onBackToKql = useCallback(() => {
    setVisorMode(VisorMode.KQL);
    setNlValue('');
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

  const showAskAiButton = isNlToEsqlEnabled && hasConnector === true;

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
          <EuiFlexItem grow={isInline ? true : false} css={styles.comboBoxWrapper}>
            <SourcesDropdown
              currentSources={selectedSources.map((source) => source.label)}
              isDisabled={isNlLoading || visorMode === VisorMode.NaturalLanguage}
              onChangeSources={(newSources) => {
                setSelectedSources(newSources.map((source) => ({ label: source })));
                userSelectedSourceRef.current = true;
              }}
            />
          </EuiFlexItem>
          {!isInline && <EuiFlexItem grow={false} css={styles.separator} />}

          {visorMode === VisorMode.KQL ? (
            <EuiFlexItem css={styles.searchWrapper}>
              <EuiFlexGroup
                gutterSize="none"
                alignItems="center"
                responsive={false}
                css={styles.searchInner}
              >
                {showAskAiButton && (
                  <EuiFlexItem grow={false} css={styles.aiBadgeWrapper}>
                    <EuiBadge
                      color="primary"
                      onClick={onAskAiClick}
                      onClickAriaLabel={askAiLabel}
                      data-test-subj="esqlVisorAskAiButton"
                    >
                      <EuiIcon type="sparkles" size="s" aria-hidden={true} /> Ask AI
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <KQLComponent
                    iconType=""
                    disableLanguageSwitcher={true}
                    indexPatterns={adHocDataView ? [adHocDataView] : []}
                    bubbleSubmitEvent={false}
                    query={{ query: searchValue, language: 'kuery' }}
                    disableAutoFocus={true}
                    placeholder={searchPlaceholder}
                    onChange={(newQuery) => onKqlValueChange(newQuery.query as string)}
                    onSubmit={(newQuery) => onKqlSubmit(newQuery.query as string)}
                    appName="esqlEditorVisor"
                    dataTestSubj="esqlVisorKQLQueryInput"
                    size="s"
                    isClearable={false}
                  />
                </EuiFlexItem>
                {searchValue.trim() && (
                  <EuiFlexItem grow={false} css={styles.enterHint}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="returnKey" size="s" aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {enterHintFilterLabel}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : (
            <EuiFlexItem css={styles.nlInputWrapper}>
              <EuiFlexGroup
                gutterSize="none"
                alignItems="center"
                responsive={false}
                css={styles.searchInner}
              >
                <EuiFlexItem grow={false} css={styles.aiBadgeWrapper}>
                  <EuiBadge
                    color="accent"
                    iconType="cross"
                    iconSide="right"
                    onClick={onBackToKql}
                    onClickAriaLabel={backToKqlLabel}
                    data-test-subj="esqlVisorBackToKql"
                  >
                    <EuiIcon type="sparkles" size="s" aria-hidden={true} /> AI
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem css={styles.nlFormControl}>
                  <NLInput
                    value={nlValue}
                    placeholder={nlPlaceholder}
                    disabled={isNlLoading}
                    onChange={setNlValue}
                    onSubmit={onNlSubmit}
                    inputStyles={styles.nlInput}
                  />
                </EuiFlexItem>
                {isNlLoading ? (
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
                ) : (
                  nlValue.trim() && (
                    <EuiFlexItem grow={false} css={styles.enterHint}>
                      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiIcon type="returnKey" size="s" aria-hidden={true} />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs" color="subdued">
                            {enterHintGenerateLabel}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  )
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
