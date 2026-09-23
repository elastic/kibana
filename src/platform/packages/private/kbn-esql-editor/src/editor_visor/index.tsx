/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { getIndexPatternFromESQLQuery, getESQLAdHocDataview } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AiButton } from '@kbn/ui-ai-components';
import { SubmitButton } from './submit_button';
import { VisorMode } from './visor_mode';
import { useNlGeneration } from './use_nl_generation';
import {
  searchPlaceholder,
  nlPlaceholder,
  generatingLabel,
  stopLabel,
  aiModeLabel,
  kqlModeLabel,
  visorModeLegend,
  enterHintFilterLabel,
  enterHintGenerateLabel,
} from './visor_i18n';
import { NLInput } from './nl_input';
import { visorStyles } from './visor.styles';
import { SparklesIcon } from './sparkles_icon';
import type { ESQLEditorDeps } from '../types';
import { useNlToEsqlCheck } from '../hooks/use_nl_to_esql_check';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';

export interface QuickSearchVisorProps {
  // Current ESQL query
  query: string;
  // Whether the visor is rendered inside an inline editor (uses shorter placeholders)
  isInline?: boolean;
  // Whether the visor is currently visible (controls CSS transition for inline toggle)
  isVisible?: boolean;
  // Called with the LLM-generated ES|QL so the parent editor can show the diff review UI
  onNlResult?: (generatedQuery: string) => void;
  // Callback when the query is updated and submitted
  onUpdateAndSubmitQuery: (query: string) => void;
  telemetryService?: ESQLEditorTelemetryService;
}

export function QuickSearchVisor({
  query,
  isInline,
  isVisible = true,
  onNlResult,
  onUpdateAndSubmitQuery,
  telemetryService,
}: QuickSearchVisorProps) {
  const kibana = useKibana<ESQLEditorDeps>();
  const { kql, data } = kibana.services;
  const isNlToEsqlEnabled = useNlToEsqlCheck();
  const euiThemeContext = useEuiTheme();
  const [searchValue, setSearchValue] = useState('');
  const [visorMode, setVisorMode] = useState<VisorMode>(VisorMode.KQL);
  const [adHocDataView, setAdHocDataView] = useState<DataView | null>(null);

  const { nlValue, setNlValue, isNlLoading, hasConnector, onNlSubmit, onStopGeneration } =
    useNlGeneration({ query, onNlResult, onUpdateAndSubmitQuery, telemetryService });
  const KQLComponent = kql.autocomplete.hasQuerySuggestions('kuery') ? kql.QueryStringInput : null;

  const sourcesKey = useMemo(() => getIndexPatternFromESQLQuery(query), [query]);

  const onKqlValueChange = useCallback((kqlQuery: string) => {
    setSearchValue(kqlQuery);
  }, []);

  const onKqlSubmit = useCallback(
    (kqlQuery: string) => {
      if (sourcesKey && kqlQuery.trim()) {
        const sourceCommand = query.trim().toUpperCase().startsWith('TS ') ? 'TS' : 'FROM';
        const newQuery = `${sourceCommand} ${sourcesKey} | WHERE KQL("""${kqlQuery.trim()}""")`;
        onUpdateAndSubmitQuery(newQuery);
        setSearchValue('');
      }
    },
    [sourcesKey, query, onUpdateAndSubmitQuery]
  );

  const onVisorModeChange = useCallback(
    (id: string) => {
      setVisorMode(id as VisorMode);
      if (id === VisorMode.KQL) {
        setNlValue('');
      }
    },
    [setNlValue]
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

  const isKqlMode = visorMode === VisorMode.KQL;
  const styles = visorStyles(euiThemeContext, Boolean(isInline), isVisible);

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
      {...(!isVisible && { inert: '' })}
    >
      <EuiFlexItem css={styles.visorWrapper}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
        >
          <EuiFlexItem css={isKqlMode ? styles.searchWrapper : styles.nlInputWrapper}>
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              responsive={false}
              css={styles.searchInner}
            >
              {showAskAiButton && (
                <EuiFlexItem grow={false} css={styles.modeToggleWrapper}>
                  <div role="group" aria-label={visorModeLegend} css={styles.modeToggle}>
                    <span css={[styles.kqlModeButton, isKqlMode && styles.kqlModeButtonActive]}>
                      <EuiToolTip content={kqlModeLabel} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="query"
                          size="s"
                          color="text"
                          display="empty"
                          aria-label={kqlModeLabel}
                          aria-pressed={isKqlMode}
                          isSelected={isKqlMode}
                          onClick={() => onVisorModeChange(VisorMode.KQL)}
                          data-test-subj="esqlVisorModeKql"
                        />
                      </EuiToolTip>
                    </span>
                    <AiButton
                      iconType={SparklesIcon as unknown as 'sparkles'}
                      size="s"
                      variant={isKqlMode ? 'outlined' : 'accent'}
                      aria-pressed={!isKqlMode}
                      isSelected={!isKqlMode}
                      onClick={() => onVisorModeChange(VisorMode.NaturalLanguage)}
                      data-test-subj="esqlVisorAskAiButton"
                      css={isKqlMode ? styles.aiButtonSparkleHover : undefined}
                    >
                      {aiModeLabel}
                    </AiButton>
                  </div>
                </EuiFlexItem>
              )}
              {isKqlMode ? (
                <>
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
                    <SubmitButton
                      tooltip={enterHintFilterLabel}
                      onClick={() => onKqlSubmit(searchValue)}
                      data-test-subj="esqlVisorKQLSubmit"
                    />
                  )}
                </>
              ) : (
                <>
                  <EuiFlexItem>
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
                      <SubmitButton
                        tooltip={enterHintGenerateLabel}
                        onClick={onNlSubmit}
                        data-test-subj="esqlVisorNLSubmit"
                      />
                    )
                  )}
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
