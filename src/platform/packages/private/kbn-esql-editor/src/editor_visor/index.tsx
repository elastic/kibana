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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import { isEqual } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SourcesDropdown } from './sources_dropdown';
import { ModeSelector, VisorMode } from './mode_selector';
import { visorStyles, visorWidthPercentage, dropdownWidthPercentage } from './visor.styles';
import type { ESQLEditorDeps } from '../types';
import { extractQueryFromLLMMessage } from './utils';

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
  const { kql, core } = kibana.services;
  const isDarkMode = useKibanaIsDarkMode();
  const { euiTheme } = useEuiTheme();
  const [selectedSources, setSelectedSources] = useState<EuiComboBoxOptionOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [visorMode, setVisorMode] = useState<VisorMode>(VisorMode.KQL);
  const [nlValue, setNlValue] = useState('');
  const [isNlLoading, setIsNlLoading] = useState(false);
  const kqlInputRef = useRef<HTMLDivElement>(null);
  const nlInputRef = useRef<HTMLInputElement>(null);
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
      const result = await core.http.post<{ content: string }>('/internal/esql/nl_to_esql', {
        body: JSON.stringify({ query: trimmed }),
      });
      if (result.content) {
        const extractedQuery = extractQueryFromLLMMessage(result.content);
        if (extractedQuery) {
          onUpdateAndSubmitQuery(extractedQuery);
        }
        setNlValue('');
      }
    } finally {
      setIsNlLoading(false);
    }
  }, [nlValue, isNlLoading, core.http, onUpdateAndSubmitQuery]);

  const onModeChange = useCallback((mode: VisorMode) => {
    setVisorMode(mode);
  }, []);

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

  useEffect(() => {
    if (isVisible) {
      if (visorMode === VisorMode.KQL && kqlInputRef.current) {
        const textArea = kqlInputRef.current.querySelector('textarea');
        textArea?.focus();
      } else if (visorMode === VisorMode.NaturalLanguage && nlInputRef.current) {
        nlInputRef.current.focus();
      }
    }
  }, [isVisible, visorMode]);

  const comboBoxWidth = useMemo(() => {
    const labelLength = selectedSources.map((s) => s.label).join(', ').length || 0;
    const maxComboBoxWidth = window.innerWidth * visorWidthPercentage * dropdownWidthPercentage;
    return calculateWidthFromCharCount(labelLength, { maxWidth: maxComboBoxWidth });
  }, [selectedSources]);

  const styles = visorStyles(
    euiTheme,
    comboBoxWidth,
    Boolean(isSpaceReduced),
    isVisible,
    isDarkMode
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
      <EuiFlexItem grow={false} css={styles.visorWrapper}>
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
          css={styles.visorGradientBox}
        >
          <EuiFlexItem grow={false} css={styles.modeSelectWrapper}>
            <ModeSelector onModeChange={onModeChange} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={styles.separator} />
          {visorMode === VisorMode.KQL ? (
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
                    iconType="search"
                    disableLanguageSwitcher={true}
                    indexPatterns={selectedSources.map((source) => source.label)}
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
              <EuiFieldText
                inputRef={nlInputRef}
                compressed
                fullWidth
                icon="sparkles"
                placeholder={nlPlaceholder}
                value={nlValue}
                isLoading={isNlLoading}
                disabled={!isVisible || isNlLoading}
                onChange={(e) => setNlValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onNlSubmit();
                  }
                }}
                data-test-subj="esqlVisorNLQueryInput"
                css={styles.nlInput}
              />
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
