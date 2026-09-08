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
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import { isEqual } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SourcesDropdown } from './sources_dropdown';
import { SubmitButton } from './submit_button';
import { VisorMode } from './visor_mode';
import { useNlGeneration } from './use_nl_generation';
import {
  searchPlaceholder,
  nlPlaceholder,
  generatingLabel,
  stopLabel,
  askAiLabel,
  backToKqlLabel,
  enterHintFilterLabel,
  enterHintGenerateLabel,
} from './visor_i18n';
import { NLInput } from './nl_input';
import { visorStyles, visorWidthPercentage, dropdownWidthPercentage } from './visor.styles';
import type { ESQLEditorDeps } from '../types';
import { useNlToEsqlCheck } from '../hooks/use_nl_to_esql_check';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';

export interface QuickSearchVisorProps {
  // Current ESQL query
  query: string;
  // Handling smaller space for the visor
  isSpaceReduced?: boolean;
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
  isSpaceReduced,
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
  const [selectedSources, setSelectedSources] = useState<EuiComboBoxOptionOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [visorMode, setVisorMode] = useState<VisorMode>(VisorMode.KQL);
  const [adHocDataView, setAdHocDataView] = useState<DataView | null>(null);
  const initializedRef = useRef(false);
  const userSelectedSourceRef = useRef(false);

  const { nlValue, setNlValue, isNlLoading, hasConnector, onNlSubmit, onStopGeneration } =
    useNlGeneration({ query, onNlResult, onUpdateAndSubmitQuery, telemetryService });
  const KQLComponent = kql.autocomplete.hasQuerySuggestions('kuery') ? kql.QueryStringInput : null;

  const onKqlValueChange = useCallback((kqlQuery: string) => {
    setSearchValue(kqlQuery);
  }, []);

  const onKqlSubmit = useCallback(
    (kqlQuery: string) => {
      if (selectedSources.length > 0 && kqlQuery.trim()) {
        const selectedSourceNames = selectedSources.map((source) => source.label).join(', ');
        const sourceCommand = query.trim().toUpperCase().startsWith('TS ') ? 'TS' : 'FROM';
        const newQuery = `${sourceCommand} ${selectedSourceNames} | WHERE KQL("""${kqlQuery.trim()}""")`;
        onUpdateAndSubmitQuery(newQuery);
        setSearchValue('');
        userSelectedSourceRef.current = false;
      }
    },
    [selectedSources, query, onUpdateAndSubmitQuery]
  );

  const onAskAiClick = useCallback(() => {
    setVisorMode(VisorMode.NaturalLanguage);
  }, []);

  const onBackToKql = useCallback(() => {
    setVisorMode(VisorMode.KQL);
    setNlValue('');
  }, [setNlValue]);

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

  const comboBoxWidth = useMemo(() => {
    if (isInline) return 0;
    const labelLength = selectedSources.map((s) => s.label).join(', ').length || 0;
    const maxComboBoxWidth = window.innerWidth * visorWidthPercentage * dropdownWidthPercentage;
    return calculateWidthFromCharCount(labelLength, { maxWidth: maxComboBoxWidth });
  }, [isInline, selectedSources]);

  const styles = visorStyles(
    euiThemeContext,
    comboBoxWidth,
    Boolean(isSpaceReduced),
    Boolean(isInline),
    isVisible
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
      {...(!isVisible && { inert: '' })}
    >
      <EuiFlexItem css={styles.visorWrapper}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
          css={styles.visorBox}
        >
          <EuiFlexItem grow={Boolean(isInline)} css={styles.comboBoxWrapper}>
            <SourcesDropdown
              currentSources={selectedSources.map((source) => source.label)}
              isDisabled={isNlLoading || visorMode === VisorMode.NaturalLanguage}
              onChangeSources={(newSources) => {
                setSelectedSources(newSources.map((source) => ({ label: source })));
                userSelectedSourceRef.current = true;
              }}
              onAutoSelectSources={(newSources) => {
                setSelectedSources(newSources.map((source) => ({ label: source })));
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
                  <SubmitButton
                    tooltip={enterHintFilterLabel}
                    onClick={() => onKqlSubmit(searchValue)}
                    data-test-subj="esqlVisorKQLSubmit"
                  />
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
                    color="primary"
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
                    <SubmitButton
                      tooltip={enterHintGenerateLabel}
                      onClick={onNlSubmit}
                      data-test-subj="esqlVisorNLSubmit"
                    />
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
