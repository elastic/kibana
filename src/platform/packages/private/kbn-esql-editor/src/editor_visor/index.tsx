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
  useEuiTheme,
  type EuiComboBoxOptionOption,
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

export { NL_TO_ESQL_FLAG } from '../hooks/use_nl_to_esql_check';
export { VisorMode } from './mode_selector';

export interface QuickSearchVisorProps {
  // Current ESQL query
  query: string;
  // Handling smaller space for the visor
  isSpaceReduced?: boolean;
  // Whether the visor is visible
  isVisible: boolean;
  // Callback when the query is updated and submitted
  onUpdateAndSubmitQuery: (query: string) => void;
  // Callback to toggle the visor visibility
  onToggleVisor: () => void;
}

export const searchPlaceholder = i18n.translate('esqlEditor.visor.searchPlaceholder', {
  defaultMessage: 'Filter your data using KQL',
});

const nlPlaceholder = i18n.translate('esqlEditor.visor.nlPlaceholder', {
  defaultMessage: 'Describe the query you want in plain language',
});

const closeButtonAriaLabel = i18n.translate('esqlEditor.visor.closeButtonAriaLabel', {
  defaultMessage: 'Close quick search visor',
});

export function QuickSearchVisor({
  query,
  isSpaceReduced,
  isVisible,
  onUpdateAndSubmitQuery,
  onToggleVisor,
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

  const onNlSubmit = useCallback(async () => {
    const trimmed = nlValue.trim();
    if (!trimmed || isNlLoading) return;

    setIsNlLoading(true);
    try {
      const sourceNames = selectedSources.map((s) => s.label);
      const result = await core.http.post<{ content: string }>(NL_TO_ESQL_ROUTE, {
        body: JSON.stringify({
          query: trimmed,
          sources: sourceNames.length ? sourceNames : undefined,
        }),
      });
      if (result.content) {
        onUpdateAndSubmitQuery(result.content);
        setNlValue('');
      }
    } catch (error) {
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
    selectedSources,
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
      if (mode === VisorMode.NaturalLanguage) {
        checkConnectorAvailability();
      }
    },
    [checkConnectorAvailability]
  );

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
    if (!isVisible || !sourcesKey) {
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
  }, [isVisible, sourcesKey, data.dataViews]);

  useEffect(() => {
    if (isVisible && visorMode === VisorMode.KQL && kqlInputRef.current) {
      const textArea = kqlInputRef.current.querySelector('textarea');
      textArea?.focus();
    }
  }, [isVisible, visorMode]);

  const comboBoxWidth = useMemo(() => {
    const labelLength = selectedSources.map((s) => s.label).join(', ').length || 0;
    const maxComboBoxWidth = window.innerWidth * visorWidthPercentage * dropdownWidthPercentage;
    return calculateWidthFromCharCount(labelLength, { maxWidth: maxComboBoxWidth });
  }, [selectedSources]);

  const styles = visorStyles(
    euiThemeContext,
    comboBoxWidth,
    Boolean(isSpaceReduced),
    isVisible,
    visorMode
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
      {...(!isVisible && { inert: '' })}
    >
      <EuiFlexItem grow={false} css={styles.visorWrapper}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
          css={styles.visorBox}
        >
          {isNlToEsqlEnabled && (
            <>
              <EuiFlexItem grow={false} css={styles.modeSelectWrapper}>
                <ModeSelector onModeChange={onModeChange} />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={styles.separator} />
            </>
          )}
          {visorMode === VisorMode.KQL || !isNlToEsqlEnabled ? (
            <>
              <EuiFlexItem css={styles.comboBoxWrapper}>
                <SourcesDropdown
                  currentSources={selectedSources.map((source) => source.label)}
                  onChangeSources={(newSources) => {
                    setSelectedSources(newSources.map((source) => ({ label: source })));
                    userSelectedSourceRef.current = true;
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={styles.separator} />
              <EuiFlexItem css={styles.searchWrapper}>
                <div ref={kqlInputRef}>
                  <KQLComponent
                    isDisabled={!isVisible}
                    // If we remove the prop, the icon still appears (!!)
                    iconType=""
                    disableLanguageSwitcher={true}
                    indexPatterns={adHocDataView ? [adHocDataView] : []}
                    bubbleSubmitEvent={false}
                    query={{
                      query: searchValue,
                      language: 'kuery',
                    }}
                    disableAutoFocus={false}
                    placeholder={searchPlaceholder}
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
            </>
          ) : (
            <EuiFlexItem css={styles.nlInputWrapper}>
              {hasConnector === false ? (
                <NoConnectorMessage basePath={core.http.basePath} />
              ) : (
                <NLInput
                  value={nlValue}
                  placeholder={nlPlaceholder}
                  disabled={!isVisible || isNlLoading}
                  onChange={setNlValue}
                  onSubmit={onNlSubmit}
                  inputStyles={styles.nlInput}
                />
              )}
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={styles.closeButtonWrapper}>
        <EuiButtonIcon
          color="text"
          display="base"
          size="s"
          iconSize="m"
          onClick={onToggleVisor}
          iconType="cross"
          aria-label={closeButtonAriaLabel}
          css={styles.closeButton}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
