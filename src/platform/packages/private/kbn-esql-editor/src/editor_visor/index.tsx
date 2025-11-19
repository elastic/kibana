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
  EuiToolTip,
  useEuiTheme,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import { isEqual } from 'lodash';
import { SourcesDropdown } from './sources_dropdown';
import { visorStyles, visorWidthPercentage, dropdownWidthPercentage } from './visor.styles';

export interface QuickSearchVisorProps {
  // Current ESQL query
  query: string;
  // Handling smaller space for the visor
  isSpaceReduced?: boolean;
  // Whether the visor is visible
  isVisible: boolean;
  // Callback when the visor is closed
  onClose: () => void;
  // Callback when the query is updated and submitted
  onUpdateAndSubmitQuery: (query: string) => void;
}

const searchPlaceholder = i18n.translate('esqlEditor.visor.searchPlaceholder', {
  defaultMessage: 'Search...',
});

const clearSearchAriaLabel = i18n.translate('esqlEditor.visor.searchClearLabel', {
  defaultMessage: 'Clear the search',
});

const closeQuickSearchLabel = i18n.translate('esqlEditor.visor.closeSearchLabel', {
  defaultMessage: 'Close quick search',
});

export function QuickSearchVisor({
  query,
  isSpaceReduced,
  isVisible,
  onClose,
  onUpdateAndSubmitQuery,
}: QuickSearchVisorProps) {
  const isDarkMode = useKibanaIsDarkMode();
  const { euiTheme } = useEuiTheme();
  const [selectedSources, setSelectedSources] = useState<EuiComboBoxOptionOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const userSelectedSourceRef = useRef(false);

  const onSearchValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const onSearchClick = useCallback(() => {
    // Focus after popover closes
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 150);
  }, []);

  const onVisorClose = useCallback(() => {
    onClose();
    // Reset user selection tracking when visor closes
    userSelectedSourceRef.current = false;
  }, [onClose]);

  const onSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && selectedSources.length > 0 && searchValue.trim()) {
        const selectedSourceNames = selectedSources.map((source) => source.label).join(', ');
        if (selectedSourceNames && searchValue.trim()) {
          // Support of time_series
          const sourceCommand = query.trim().toUpperCase().startsWith('TS ') ? 'TS' : 'FROM';
          const newQuery = `${sourceCommand} ${selectedSourceNames} | WHERE KQL("${searchValue.trim()}")`;
          onUpdateAndSubmitQuery(newQuery);
          // Clear the search value after submitting the query
          setSearchValue('');
          // Reset user selection tracking when visor closes
          userSelectedSourceRef.current = false;
        }
      }
    },
    [selectedSources, searchValue, query, onUpdateAndSubmitQuery]
  );

  useEffect(() => {
    const sourceFromUpdatedQuery = getIndexPatternFromESQLQuery(query);
    const sources = sourceFromUpdatedQuery.split(',').map((source) => ({ label: source.trim() }));
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
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
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
          <EuiFieldText
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchValueChange}
            onKeyDown={onSearchKeyDown}
            onClick={onSearchClick}
            aria-label={searchPlaceholder}
            inputRef={searchInputRef}
            compressed
            fullWidth
            css={styles.searchFieldStyles}
            data-test-subj="ESQLEditor-visor-search-input"
            append={
              <EuiToolTip position="top" content={closeQuickSearchLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  color="text"
                  iconSize="m"
                  onClick={onVisorClose}
                  iconType="cross"
                  aria-label={clearSearchAriaLabel}
                />
              </EuiToolTip>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
