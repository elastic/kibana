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
import { EuiFlexGroup, EuiFlexItem, useEuiTheme, type EuiComboBoxOptionOption } from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import { isEqual } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SourcesDropdown } from './sources_dropdown';
import { visorStyles, visorWidthPercentage, dropdownWidthPercentage } from './visor.styles';
import type { ESQLEditorDeps } from '../types';

export interface QuickSearchVisorProps {
  // Current ESQL query
  query: string;
  // Handling smaller space for the visor
  isSpaceReduced?: boolean;
  // Whether the visor is visible
  isVisible: boolean;
  // Callback when the query is updated and submitted
  onUpdateAndSubmitQuery: (query: string) => void;
}

const searchPlaceholder = i18n.translate('esqlEditor.visor.searchPlaceholder', {
  defaultMessage: 'Search...',
});

export function QuickSearchVisor({
  query,
  isSpaceReduced,
  isVisible,
  onUpdateAndSubmitQuery,
}: QuickSearchVisorProps) {
  const kibana = useKibana<ESQLEditorDeps>();
  const { kql } = kibana.services;
  const isDarkMode = useKibanaIsDarkMode();
  const { euiTheme } = useEuiTheme();
  const [selectedSources, setSelectedSources] = useState<EuiComboBoxOptionOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
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
    if (isVisible && kqlInputRef.current) {
      // Find the textarea within the KQL input and focus it
      const textArea = kqlInputRef.current.querySelector('textarea');
      textArea?.focus();
    }
  }, [isVisible]);

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
    <div css={styles.visorContainer} data-test-subj="ESQLEditor-quick-search-visor">
      <EuiFlexGroup
        gutterSize="none"
        alignItems="center"
        justifyContent="flexStart"
        responsive={false}
        css={styles.visorWrapper}
      >
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
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
