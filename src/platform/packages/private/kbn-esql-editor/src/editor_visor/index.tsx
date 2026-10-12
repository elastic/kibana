/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { getIndexPatternFromESQLQuery, getSourceCommandQueryFromESQLQuery } from '@kbn/esql-utils';
import { EsqlSource, registerEsqlSourceInDataViewsCache } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SvgAiGradientDefs, useSvgAiGradient } from '@kbn/ui-ai-components';
import {
  getEffectiveProjectRouting,
  usePickerProjectRouting,
} from '../hooks/use_effective_project_routing';
import { SubmitButton } from './submit_button';
import { VisorMode } from './visor_mode';
import { useNlGeneration } from './use_nl_generation';
import {
  searchPlaceholder,
  nlPlaceholder,
  generatingLabel,
  stopLabel,
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

type VisorStyles = ReturnType<typeof visorStyles>;

function AskAiButton({
  isSelected,
  onSelect,
  styles,
}: {
  isSelected: boolean;
  onSelect: () => void;
  styles: VisorStyles;
}) {
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient({ variant: 'outlined' });

  return (
    <>
      {isSelected && <SvgAiGradientDefs gradientId={gradientId} colors={colors} />}
      <EuiToolTip content={aiModeTooltip} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={SparklesIcon}
          size="xs"
          iconSize="m"
          color="text"
          display="empty"
          aria-label={aiModeTooltip}
          aria-pressed={isSelected}
          isSelected={isSelected}
          onClick={onSelect}
          data-test-subj="esqlVisorAskAiButton"
          css={[
            styles.modeIconButton,
            isSelected && styles.aiButtonSparkleHover,
            isSelected && styles.aiButtonSelected,
            isSelected && iconGradientCss,
          ]}
        />
      </EuiToolTip>
    </>
  );
}

function VisorModeToggle({
  isKqlMode,
  onModeChange,
  styles,
}: {
  isKqlMode: boolean;
  onModeChange: (mode: VisorMode) => void;
  styles: VisorStyles;
}) {
  return (
    <div role="group" aria-label={visorModeLegend} css={styles.modeToggle}>
      <EuiToolTip content={kqlModeLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="magnify"
          size="xs"
          iconSize="m"
          color="text"
          display="empty"
          aria-label={kqlModeLabel}
          aria-pressed={isKqlMode}
          isSelected={isKqlMode}
          onClick={() => onModeChange(VisorMode.KQL)}
          data-test-subj="esqlVisorModeKql"
          css={[styles.modeIconButton, isKqlMode && styles.modeIconButtonActive]}
        />
      </EuiToolTip>
      <AskAiButton
        isSelected={!isKqlMode}
        onSelect={() => onModeChange(VisorMode.NaturalLanguage)}
        styles={styles}
      />
    </div>
  );
}

function VisorLayout({
  showModeToggle,
  isKqlMode,
  onModeChange,
  styles,
  isVisible,
  children,
}: {
  showModeToggle: boolean;
  isKqlMode: boolean;
  onModeChange: (mode: VisorMode) => void;
  styles: VisorStyles;
  isVisible: boolean;
  children: ReactNode;
}) {
  return (
    <div
      css={styles.visorContainer}
      data-test-subj="ESQLEditor-quick-search-visor"
      {...(!isVisible && { inert: '' })}
    >
      {showModeToggle && (
        <VisorModeToggle isKqlMode={isKqlMode} onModeChange={onModeChange} styles={styles} />
      )}
      {children}
    </div>
  );
}

function NlVisorActions({
  isLoading,
  value,
  onSubmit,
  onStop,
  styles,
}: {
  isLoading: boolean;
  value: string;
  onSubmit: () => void;
  onStop: () => void;
  styles: VisorStyles;
}) {
  if (isLoading) {
    return (
      <div css={styles.generating}>
        <EuiText size="xs" color="subdued">
          {generatingLabel}
        </EuiText>
        <EuiButtonEmpty
          size="s"
          color="primary"
          iconType="stop"
          iconSide="left"
          onClick={onStop}
          data-test-subj="esqlVisorStopGeneration"
        >
          {stopLabel}
        </EuiButtonEmpty>
      </div>
    );
  }

  if (!value.trim()) {
    return null;
  }

  return (
    <SubmitButton
      tooltip={enterHintGenerateLabel}
      onClick={onSubmit}
      data-test-subj="esqlVisorNLSubmit"
    />
  );
}

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
  const [visorMode, setVisorMode] = useState(VisorMode.KQL);
  const [kqlDataView, setKqlDataView] = useState<{ sourceQuery: string; dataView: DataView }>();
  const [isKqlFocused, setIsKqlFocused] = useState(false);
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
  const showAskAiButton = isNlToEsqlEnabled && hasConnector === true;
  const KQLComponent = kql.autocomplete.hasQuerySuggestions('kuery') ? kql.QueryStringInput : null;

  const pickerProjectRouting = usePickerProjectRouting();

  const onKqlValueChange = useCallback((kqlQuery: string) => {
    setSearchValue(kqlQuery);
  }, []);

  const onKqlSubmit = useCallback(
    (kqlQuery: string) => {
      if (isDisabled || disableSubmitAction) return;
      const sourcesKey = getIndexPatternFromESQLQuery(query);
      if (sourcesKey && kqlQuery.trim()) {
        const sourceCommand = query.trim().toUpperCase().startsWith('TS ') ? 'TS' : 'FROM';
        const newQuery = `${sourceCommand} ${sourcesKey} | WHERE KQL("""${kqlQuery.trim()}""")`;
        onUpdateAndSubmitQuery(newQuery);
        setSearchValue('');
        onKqlSubmitted?.();
      }
    },
    [isDisabled, disableSubmitAction, query, onUpdateAndSubmitQuery, onKqlSubmitted]
  );

  const onNlSubmit = useCallback(() => {
    if (isDisabled) return;
    // NL does not need an existing query, unlike KQL, so an empty editor can still submit it.
    if (disableSubmitAction && query.trim()) return;
    submitNl();
  }, [isDisabled, disableSubmitAction, query, submitNl]);

  const onVisorModeChange = useCallback(
    (id: VisorMode) => {
      setVisorMode(id);
      if (id === VisorMode.KQL) {
        onStopGeneration();
      }
    },
    [onStopGeneration]
  );

  // License and connector are known only after the first render. Start in natural language once they are.
  useEffect(() => {
    if (showAskAiButton) {
      setVisorMode(VisorMode.NaturalLanguage);
    }
  }, [showAskAiButton]);

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
    if (!isVisible) {
      setKqlDataView(undefined);
      return;
    }
    // The fields only serve KQL suggestions, shown while the KQL input is focused: derive the
    // source and look it up only then, never while the ES|QL query is typed. They are kept after
    // blur and reused for the same source.
    if (!isKqlFocused) {
      return;
    }
    const sourceQuery = getSourceCommandQueryFromESQLQuery(query);
    if (!sourceQuery) {
      setKqlDataView(undefined);
      return;
    }
    // Fields loaded for another source are stale.
    setKqlDataView((current) => (current?.sourceQuery === sourceQuery ? current : undefined));
    let cancelled = false;
    // Only the fields are needed, as before: skip the time field request.
    EsqlSource.create({
      query: sourceQuery,
      http: core.http,
      projectRouting: getEffectiveProjectRouting(query, pickerProjectRouting),
      resolveTimeField: false,
    })
      .then((source) => registerEsqlSourceInDataViewsCache(data.dataViews, source, core.http))
      .then(
        (dataView) => !cancelled && setKqlDataView({ sourceQuery, dataView }),
        () => !cancelled && setKqlDataView(undefined)
      );
    return () => {
      cancelled = true;
    };
  }, [isVisible, isKqlFocused, query, pickerProjectRouting, data.dataViews, core.http]);

  const isKqlMode = visorMode === VisorMode.KQL;
  const styles = visorStyles(euiThemeContext, Boolean(isInline), isVisible);

  if (!KQLComponent) {
    return null;
  }

  if (isKqlMode) {
    return (
      <VisorLayout
        showModeToggle={showAskAiButton}
        isKqlMode
        onModeChange={onVisorModeChange}
        styles={styles}
        isVisible={isVisible}
      >
        <div css={[styles.inputSlot, styles.searchWrapper]}>
          <KQLComponent
            iconType=""
            disableLanguageSwitcher={true}
            indexPatterns={kqlDataView ? [kqlDataView.dataView] : []}
            bubbleSubmitEvent={false}
            query={{ query: searchValue, language: 'kuery' }}
            disableAutoFocus={true}
            placeholder={searchPlaceholder}
            onChange={(newQuery) => onKqlValueChange(newQuery.query as string)}
            onSubmit={(newQuery) => onKqlSubmit(newQuery.query as string)}
            appName="esqlEditorVisor"
            dataTestSubj="esqlVisorKQLQueryInput"
            onChangeQueryInputFocus={setIsKqlFocused}
            size={isInline ? 's' : undefined}
            isClearable={false}
          />
        </div>
        {searchValue.trim() && (
          <SubmitButton
            tooltip={enterHintFilterLabel}
            onClick={() => onKqlSubmit(searchValue)}
            data-test-subj="esqlVisorKQLSubmit"
          />
        )}
      </VisorLayout>
    );
  }

  return (
    <VisorLayout
      showModeToggle={showAskAiButton}
      isKqlMode={false}
      onModeChange={onVisorModeChange}
      styles={styles}
      isVisible={isVisible}
    >
      <div css={styles.inputSlot}>
        <NLInput
          value={nlValue}
          placeholder={nlPlaceholder}
          disabled={isNlLoading}
          onChange={setNlValue}
          onSubmit={onNlSubmit}
          inputStyles={styles.nlInput}
        />
      </div>
      <NlVisorActions
        isLoading={isNlLoading}
        value={nlValue}
        onSubmit={onNlSubmit}
        onStop={onStopGeneration}
        styles={styles}
      />
    </VisorLayout>
  );
}
