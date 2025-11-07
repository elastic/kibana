/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { getESQLSources } from '../helpers';
import type { ESQLEditorDeps } from '../types';
import { visorStyles } from './visor.styles';

export function QuickEditVisor({
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
  const kibana = useKibana<ESQLEditorDeps>();
  const { core } = kibana.services;
  const getLicense = kibana.services?.esql?.getLicense;
  const { euiTheme } = useEuiTheme();
  const [selectedSource, setSelectedSource] = useState<EuiComboBoxOptionOption[]>([]);
  const [sourcesOptions, setSourcesOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isMounted = useMountedState();

  const onSearchValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const onSourceSelectionChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    setSelectedSource(selectedOptions);
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
    async function fetchSources() {
      const sources = await getESQLSources(core, getLicense);
      if (isMounted()) {
        setSourcesOptions(
          sources.filter((source) => !source.hidden).map((source) => ({ label: source.name }))
        );
      }
    }
    if (sourcesOptions.length === 0) {
      fetchSources();
    }
  }, [core, getLicense, sourcesOptions.length, isMounted]);

  useEffect(() => {
    const sourceFromUpdatedQuery = getIndexPatternFromESQLQuery(query);
    if (sourceFromUpdatedQuery && sourceFromUpdatedQuery !== selectedSource[0]?.label) {
      setSelectedSource([{ label: sourceFromUpdatedQuery }]);
    }
    setSearchValue('');
  }, [query, selectedSource]);

  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
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
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      justifyContent="flexStart"
      responsive={false}
      css={styles.visorWrapper}
    >
      <EuiFlexItem css={styles.comboBoxWrapper}>
        <EuiComboBox
          placeholder={i18n.translate('esqlEditor.visor.placeholder', {
            defaultMessage: 'Select a source to quick edit',
          })}
          options={sourcesOptions}
          selectedOptions={selectedSource}
          singleSelection={{ asPlainText: true }}
          onChange={onSourceSelectionChange}
          isClearable={false}
          data-test-subj="ESQLEditor-quickEditComboBox"
          aria-label={i18n.translate('esqlEditor.visor.ariaLabel', {
            defaultMessage: 'Quick edit source selection',
          })}
          css={styles.comboBoxStyles}
          truncationProps={{
            truncation: 'middle',
          }}
          fullWidth
          compressed
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={styles.separator} />
      <EuiFlexItem css={styles.searchWrapper}>
        <EuiFieldText
          placeholder={i18n.translate('esqlEditor.visor.searchPlaceholder', {
            defaultMessage: 'Search ...',
          })}
          value={searchValue}
          onChange={onSearchValueChange}
          onKeyDown={onSearchKeyDown}
          aria-label={i18n.translate('esqlEditor.visor.searchPlaceholder', {
            defaultMessage: 'Search ...',
          })}
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
  );
}
