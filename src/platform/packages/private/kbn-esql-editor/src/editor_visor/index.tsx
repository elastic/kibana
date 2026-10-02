/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
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
  aiModeTooltip,
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
import { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';

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
  // When true, every visor submit is a no-op (e.g. invalid date range or a disabled caller)
  isDisabled?: boolean;
  // When true, KQL submit is a no-op. Natural language is still allowed while the editor query is empty
  disableSubmitAction?: boolean;
  // Called after a KQL filter is submitted so the parent can move focus back to the editor
  onKqlSubmitted?: () => void;
}

export function QuickSearchVisor({
  query,
  isInline,
  isVisible = true,
  onNlResult,
  onUpdateAndSubmitQuery,
  isDisabled = false,
  disableSubmitAction = false,
  onKqlSubmitted,
}: QuickSearchVisorProps) {
  const kibana = useKibana<ESQLEditorDeps>();
  const { kql, data, core } = kibana.services;
  const isNlToEsqlEnabled = useNlToEsqlCheck();
  const euiThemeContext = useEuiTheme();
  const [searchValue, setSearchValue] = useState('');
  const [visorMode, setVisorMode] = useState<VisorMode>(VisorMode.KQL);
  const hasTypedNlPlaceholderRef = useRef(false);
  const [typeNlPlaceholder, setTypeNlPlaceholder] = useState(false);
  const [adHocDataView, setAdHocDataView] = useState<DataView | null>(null);
  const wasVisibleRef = useRef(isVisible);
  const telemetryService = useMemo(
    () => new ESQLEditorTelemetryService(core.analytics),
    [core.analytics]
  );

  const {
    nlValue,
    setNlValue,
    isNlLoading,
    hasConnector,
    onNlSubmit: submitNl,
    onStopGeneration,
  } = useNlGeneration({ query, onNlResult, onUpdateAndSubmitQuery, telemetryService });
  const KQLComponent = kql.autocomplete.hasQuerySuggestions('kuery') ? kql.QueryStringInput : null;

  const sourcesKey = useMemo(() => getIndexPatternFromESQLQuery(query), [query]);

  const onKqlValueChange = useCallback((kqlQuery: string) => {
    setSearchValue(kqlQuery);
  }, []);

  const onKqlSubmit = useCallback(
    (kqlQuery: string) => {
      if (isDisabled || disableSubmitAction) return;
      if (sourcesKey && kqlQuery.trim()) {
        const sourceCommand = query.trim().toUpperCase().startsWith('TS ') ? 'TS' : 'FROM';
        const newQuery = `${sourceCommand} ${sourcesKey} | WHERE KQL("""${kqlQuery.trim()}""")`;
        onUpdateAndSubmitQuery(newQuery);
        setSearchValue('');
        onKqlSubmitted?.();
      }
    },
    [isDisabled, disableSubmitAction, sourcesKey, query, onUpdateAndSubmitQuery, onKqlSubmitted]
  );

  const onNlSubmit = useCallback(() => {
    if (isDisabled) return;
    // NL does not need an existing query, unlike KQL, so an empty editor can still submit it.
    if (disableSubmitAction && query.trim()) return;
    submitNl();
  }, [isDisabled, disableSubmitAction, query, submitNl]);

  const onVisorModeChange = useCallback(
    (id: string) => {
      setVisorMode(id as VisorMode);
      if (id === VisorMode.NaturalLanguage) {
        if (!hasTypedNlPlaceholderRef.current) {
          hasTypedNlPlaceholderRef.current = true;
          setTypeNlPlaceholder(true);
        }
      } else {
        setTypeNlPlaceholder(false);
        onStopGeneration();
      }
    },
    [onStopGeneration]
  );

  useEffect(() => {
    const becameVisible = Boolean(isInline) && isVisible && !wasVisibleRef.current;
    wasVisibleRef.current = isVisible;
    if (!becameVisible) return;
    document
      .querySelector<HTMLTextAreaElement>(
        '[data-test-subj="ESQLEditor-quick-search-visor"] textarea'
      )
      ?.focus();
  }, [isInline, isVisible]);

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
                          size="xs"
                          iconSize="m"
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
                    <EuiToolTip content={aiModeTooltip} disableScreenReaderOutput>
                      <AiButton
                        iconType={SparklesIcon as unknown as 'sparkles'}
                        size="xs"
                        iconSize="m"
                        variant="outlined"
                        aria-pressed={!isKqlMode}
                        isSelected={!isKqlMode}
                        onClick={() => onVisorModeChange(VisorMode.NaturalLanguage)}
                        data-test-subj="esqlVisorAskAiButton"
                        css={[styles.aiButtonSparkleHover, !isKqlMode && styles.aiButtonSelected]}
                      >
                        {aiModeLabel}
                      </AiButton>
                    </EuiToolTip>
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
                      animatePlaceholder={typeNlPlaceholder}
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
                          <EuiButtonEmpty
                            size="s"
                            color="primary"
                            iconType="stop"
                            iconSide="left"
                            onClick={onStopGeneration}
                            data-test-subj="esqlVisorStopGeneration"
                          >
                            {stopLabel}
                          </EuiButtonEmpty>
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
