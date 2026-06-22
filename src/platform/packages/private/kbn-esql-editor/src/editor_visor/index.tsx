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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiToolTip,
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
import { ModeSelector, VisorMode } from './mode_selector';
import { NoConnectorMessage } from './no_connector_message';
import { NLInput } from './nl_input';
import { visorStyles, visorWidthPercentage, dropdownWidthPercentage } from './visor.styles';
import type { ESQLEditorDeps } from '../types';
import { useNlToEsqlCheck } from '../hooks/use_nl_to_esql_check';
import { reportEsqlError } from '../report_error';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';

export { VisorMode } from './mode_selector';

const VISOR_MODE_STORAGE_KEY = 'esqlEditor.visor.mode';

const getInitialVisorMode = (): VisorMode => {
  try {
    const stored = window.localStorage?.getItem(VISOR_MODE_STORAGE_KEY);
    if (stored === VisorMode.KQL || stored === VisorMode.NaturalLanguage) {
      return stored;
    }
  } catch {
    // localStorage is unavailable (e.g., private mode); fall through to default
  }
  return VisorMode.NaturalLanguage;
};

export interface QuickSearchVisorProps {
  // Current ESQL query
  query: string;
  // Handling smaller space for the visor
  isSpaceReduced?: boolean;
  // Whether the visor is rendered inside an inline editor (uses shorter placeholders)
  isInline?: boolean;
  // Callback when the query is updated and submitted
  onUpdateAndSubmitQuery: (query: string) => void;
  telemetryService?: ESQLEditorTelemetryService;
}

export const searchPlaceholder = i18n.translate('esqlEditor.visor.searchPlaceholder', {
  defaultMessage: 'Filter your data using KQL',
});

const searchPlaceholderShort = i18n.translate('esqlEditor.visor.searchPlaceholderShort', {
  defaultMessage: 'Filter using KQL',
});

const nlPlaceholder = i18n.translate('esqlEditor.visor.nlPlaceholder', {
  defaultMessage: 'Describe the query you want in plain language',
});

const nlPlaceholderShort = i18n.translate('esqlEditor.visor.nlPlaceholderShort', {
  defaultMessage: 'Describe in plain language',
});

const techPreviewTooltip = i18n.translate('esqlEditor.visor.techPreviewTooltip', {
  defaultMessage: 'Technical preview',
});

const submitVisorLabel = i18n.translate('esqlEditor.visor.submitAriaLabel', {
  defaultMessage: 'Submit',
});

export function QuickSearchVisor({
  query,
  isSpaceReduced,
  isInline,
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
  const [visorMode, setVisorMode] = useState<VisorMode>(getInitialVisorMode);
  const [nlValue, setNlValue] = useState('');
  const [isNlLoading, setIsNlLoading] = useState(false);
  const [hasConnector, setHasConnector] = useState<boolean | undefined>(undefined);
  const connectorCheckRef = useRef(false);
  const [adHocDataView, setAdHocDataView] = useState<DataView | null>(null);
  const kqlInputRef = useRef<HTMLDivElement>(null);
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
          // Clear the search value after submitting the query
          setSearchValue('');
          // Reset user selection tracking when visor closes
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

  const onNlSubmit = useCallback(async () => {
    const trimmed = nlValue.trim();
    if (!trimmed || isNlLoading) return;

    setIsNlLoading(true);
    const startTime = Date.now();
    try {
      const result = await core.http.post<{ content: string }>(NL_TO_ESQL_ROUTE, {
        body: JSON.stringify({
          nlInstruction: trimmed,
          currentQuery: query,
        }),
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
        onUpdateAndSubmitQuery(result.content);
        setNlValue('');
      }
    } catch (error) {
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
      setIsNlLoading(false);
    }
  }, [
    nlValue,
    isNlLoading,
    core.http,
    core.notifications.toasts,
    onUpdateAndSubmitQuery,
    query,
    trackNlResult,
  ]);

  const checkConnectorAvailability = useCallback(async () => {
    if (connectorCheckRef.current) return;
    connectorCheckRef.current = true;
    try {
      const res = await core.http.get<{ connectors: unknown[] }>('/internal/inference/connectors');
      setHasConnector(res.connectors.length > 0);
    } catch {
      setHasConnector(false);
    }
  }, [core.http]);

  const onModeChange = useCallback(
    (mode: VisorMode) => {
      setVisorMode(mode);
      try {
        window.localStorage?.setItem(VISOR_MODE_STORAGE_KEY, mode);
      } catch {
        // localStorage unavailable (private mode etc.); silently ignore
      }
      if (mode === VisorMode.NaturalLanguage) {
        checkConnectorAvailability();
      }
    },
    [checkConnectorAvailability]
  );

  useEffect(() => {
    if (visorMode === VisorMode.NaturalLanguage) {
      checkConnectorAvailability();
    }
  }, [visorMode, checkConnectorAvailability]);

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
      // Update from query prop only if user hasn't manually selected a source
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
    visorMode,
    Boolean(isInline)
  );

  if (!KQLComponent) {
    return null;
  }

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
          {isNlToEsqlEnabled && (
            <>
              <EuiFlexItem grow={false} css={styles.techPreviewIcon}>
                <EuiIconTip type="flask" size="s" color="subdued" content={techPreviewTooltip} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={styles.modeSelectWrapper}>
                <ModeSelector onModeChange={onModeChange} initialMode={visorMode} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={styles.separator} />
            </>
          )}
          {visorMode === VisorMode.KQL || !isNlToEsqlEnabled ? (
            <>
              <EuiFlexItem grow={false} css={styles.comboBoxWrapper}>
                <SourcesDropdown
                  currentSources={selectedSources.map((source) => source.label)}
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
                    <div ref={kqlInputRef}>
                      <KQLComponent
                        // If we remove the prop, the icon still appears (!!)
                        iconType=""
                        disableLanguageSwitcher={true}
                        indexPatterns={adHocDataView ? [adHocDataView] : []}
                        bubbleSubmitEvent={false}
                        query={{
                          query: searchValue,
                          language: 'kuery',
                        }}
                        disableAutoFocus={true}
                        placeholder={useShortPlaceholder ? searchPlaceholderShort : searchPlaceholder}
                        onChange={(newQuery) => {
                          onKqlValueChange(newQuery.query as string);
                        }}
                        onSubmit={(newQuery) => {
                          onKqlSubmit(newQuery.query as string);
                        }}
                        appName="esqlEditorVisor"
                        dataTestSubj="esqlVisorKQLQueryInput"
                        size="s"
                      />
                    </div>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} css={styles.submitButtonWrapper}>
                    <EuiToolTip position="top" content={submitVisorLabel} disableScreenReaderOutput>
                      <EuiButtonIcon
                        size="xs"
                        color="primary"
                        iconType="returnKey"
                        aria-label={submitVisorLabel}
                        data-test-subj="esqlVisorKQLSubmit"
                        isDisabled={!searchValue.trim() || selectedSources.length === 0}
                        onClick={() => onKqlSubmit(searchValue)}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          ) : (
            <EuiFlexItem css={styles.nlInputWrapper}>
              {hasConnector === false ? (
                <NoConnectorMessage basePath={core.http.basePath} />
              ) : (
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="center"
                  responsive={false}
                  css={styles.searchInner}
                >
                  <EuiFlexItem>
                    <NLInput
                      value={nlValue}
                      placeholder={useShortPlaceholder ? nlPlaceholderShort : nlPlaceholder}
                      disabled={isNlLoading}
                      onChange={setNlValue}
                      onSubmit={onNlSubmit}
                      inputStyles={styles.nlInput}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} css={styles.submitButtonWrapper}>
                    <EuiToolTip position="top" content={submitVisorLabel} disableScreenReaderOutput>
                      <EuiButtonIcon
                        size="xs"
                        color="primary"
                        iconType="returnKey"
                        aria-label={submitVisorLabel}
                        data-test-subj="esqlVisorNLSubmit"
                        isDisabled={!nlValue.trim() || isNlLoading}
                        onClick={() => onNlSubmit()}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
