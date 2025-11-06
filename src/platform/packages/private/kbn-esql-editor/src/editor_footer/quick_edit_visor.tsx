/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { calculateWidthFromCharCount } from '@kbn/calculate-width-from-char-count';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { getESQLSources } from '../helpers';
import type { ESQLEditorDeps } from '../types';

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
  const kibana = useKibana<ESQLEditorDeps>();
  const { core } = kibana.services;
  const getLicense = kibana.services?.esql?.getLicense;
  const { euiTheme } = useEuiTheme();
  const [selectedSource, setSelectedSource] = useState<EuiComboBoxOptionOption[]>([]);
  const [sourcesOptions, setSourcesOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [searchValue, setSearchValue] = useState('');

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
      setSourcesOptions(
        sources.filter((source) => !source.hidden).map((source) => ({ label: source.name }))
      );
    }
    if (sourcesOptions.length === 0) {
      fetchSources();
    }
  }, [core, getLicense, sourcesOptions.length]);

  useEffect(() => {
    const sourceFromUpdatedQuery = getIndexPatternFromESQLQuery(query);
    if (sourceFromUpdatedQuery && sourceFromUpdatedQuery !== selectedSource[0]?.label) {
      setSelectedSource([{ label: sourceFromUpdatedQuery }]);
    }
    setSearchValue('');
  }, [query, selectedSource]);

  const comboBoxWidth = useMemo(() => {
    return calculateWidthFromCharCount(selectedSource[0]?.label.length || 0);
  }, [selectedSource]);

  return (
    <EuiFlexGroup
      gutterSize="none"
      alignItems="center"
      justifyContent="flexStart"
      responsive={false}
      css={css`
        background: linear-gradient(107.9deg, rgb(11, 100, 221) 21.85%, rgb(255, 39, 165) 98.82%);
        padding: 1px;
        width: ${isSpaceReduced ? '90%' : '50%'};
        height: ${isVisible ? euiTheme.size.xxl : '0'};
        box-shadow: rgba(11, 14, 22, 0.03) 0px 6px 14px 0px;
        margin: ${isVisible ? `0 auto ${euiTheme.size.base}` : '0 auto 0'};
        border-radius: ${euiTheme.size.s};
        opacity: ${isVisible ? 1 : 0};
        pointer-events: ${isVisible ? 'auto' : 'none'};
        overflow: hidden;
        transition: all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
      `}
    >
      <EuiFlexItem
        css={css`
          background: ${euiTheme.colors.emptyShade};
          height: 100%;
          justify-content: center;
          border-bottom-left-radius: ${euiTheme.size.s};
          border-top-left-radius: ${euiTheme.size.s};
          padding-left: 2px;
          flex-grow: 1;
          max-width: ${comboBoxWidth}px;
        `}
      >
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
          css={css`
            .euiComboBox__inputWrap {
              box-shadow: none;
              border-radius: 0;
              border-right: 1px solid rgb(227, 232, 242);
            }
            .euiComboBox__inputWrap:focus,
            .euiComboBox__inputWrap:focus-within,
            .euiComboBox__inputWrap:hover {
              box-shadow: none !important;
              outline: none !important;
            }
          `}
          truncationProps={{
            truncation: 'middle',
          }}
          fullWidth
          compressed
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          background: ${euiTheme.colors.emptyShade};
          height: 100%;
          justify-content: center;
          border-bottom-right-radius: ${euiTheme.size.s};
          border-top-right-radius: ${euiTheme.size.s};
          padding-right: 2px;

          .euiFormControlLayout--group::after {
            border: none;
          }

          .euiFormControlLayout__append {
            background-color: ${euiTheme.colors.backgroundBasePlain};
            &::before {
              border: none;
            }
          }
        `}
      >
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
          compressed
          fullWidth
          css={css`
            box-shadow: none;
            border-radius: 0;
            &:focus,
            &:hover {
              box-shadow: none !important;
              outline: none !important;
            }
          `}
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

export function QuickEditAction({ toggleVisor }: { toggleVisor: () => void }) {
  const quickEditLabel = i18n.translate('esqlEditor.visor.quickEditLabel', {
    defaultMessage: 'Quick edit',
  });

  const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
  const COMMAND_KEY = isMac ? '⌘' : 'CTRL';
  const shortCut = COMMAND_KEY + ' K';

  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiToolTip position="top" content={quickEditLabel} disableScreenReaderOutput>
          <EuiButtonEmpty
            size="xs"
            color="primary"
            flush="both"
            onClick={toggleVisor}
            data-test-subj="ESQLEditor-toggle-quick-edit-visor"
            aria-label={quickEditLabel}
            css={css`
              margin-right: ${euiTheme.size.m};
            `}
          >
            {`${quickEditLabel} (${shortCut})`}
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
    </>
  );
}
