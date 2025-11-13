/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { SourcesDropdown } from './sources_dropdown';
import { visorStyles } from './visor.styles';

const searchPlaceholder = i18n.translate('esqlEditor.visor.searchPlaceholder', {
  defaultMessage: 'Search ...',
});

export function QuickSearchVisor({
  query,
  isSpaceReduced,
  isVisible,
  onClose,
  onUpdateAndSubmitQuery,
}: {
  query: string;
  isSpaceReduced?: boolean;
  isVisible: boolean;
  onClose: () => void;
  onUpdateAndSubmitQuery: (query: string) => void;
}) {
  const isDarkMode = useKibanaIsDarkMode();
  const { euiTheme } = useEuiTheme();
  const [selectedSource, setSelectedSource] = useState<EuiComboBoxOptionOption[]>([]);
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

  const onSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && selectedSource.length > 0 && searchValue.trim()) {
        const selectedSourceName = selectedSource[0]?.label || '';
        if (selectedSourceName && searchValue.trim()) {
          const sourceCommand = query.trim().toUpperCase().startsWith('TS ') ? 'TS' : 'FROM';
          const newQuery = `${sourceCommand} ${selectedSourceName} | WHERE KQL("${searchValue.trim()}")`;
          onUpdateAndSubmitQuery(newQuery);
          // Clear the search value after submitting the query
          setSearchValue('');
        }
      }
    },
    [selectedSource, searchValue, query, onUpdateAndSubmitQuery]
  );

  useEffect(() => {
    const sourceFromUpdatedQuery = getIndexPatternFromESQLQuery(query);

    if (!initializedRef.current) {
      if (sourceFromUpdatedQuery) {
        setSelectedSource([{ label: sourceFromUpdatedQuery }]);
      }
      setSearchValue('');
      initializedRef.current = true;
    } else if (sourceFromUpdatedQuery && !userSelectedSourceRef.current) {
      // Update from query prop only if user hasn't manually selected a source
      if (selectedSource[0]?.label !== sourceFromUpdatedQuery) {
        setSelectedSource([{ label: sourceFromUpdatedQuery }]);
      }
    }
  }, [query, selectedSource]);

  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  useEffect(() => {
    // Reset user selection tracking when visor becomes visible
    if (isVisible) {
      userSelectedSourceRef.current = false;
    }
  }, [isVisible]);

  const comboBoxWidth = useMemo(() => {
    return calculateWidthFromCharCount(selectedSource[0]?.label.length || 0);
  }, [selectedSource]);

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
            currentSource={selectedSource[0]?.label || ''}
            onChangeSource={(newSource) => {
              setSelectedSource([{ label: newSource }]);
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
            append={
              <EuiButtonIcon
                color="text"
                iconSize="m"
                onClick={onClose}
                iconType="cross"
                aria-label={i18n.translate('esqlEditor.visor.searchClearLabel', {
                  defaultMessage: 'Clear the search',
                })}
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
