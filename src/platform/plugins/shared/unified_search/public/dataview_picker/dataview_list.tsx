/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EuiSelectableProps, Direction } from '@elastic/eui';
import {
  EuiSelectable,
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonGroup,
  EuiToolTip,
  copyToClipboard,
  toSentenceCase,
  SortDirection,
} from '@elastic/eui';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { IUnifiedSearchPluginServices } from '../types';
import { sort } from './sort';
import { MIDDLE_TRUNCATION_PROPS } from '../filter_bar/filter_editor/lib/helpers';

const strings = {
  sortOrder: {
    asc: {
      getSortOrderLabel: () =>
        i18n.translate('unifiedSearch.optionsList.popover.sortOrder.asc', {
          defaultMessage: 'Ascending',
        }),
    },
    desc: {
      getSortOrderLabel: () =>
        i18n.translate('unifiedSearch.optionsList.popover.sortOrder.desc', {
          defaultMessage: 'Descending',
        }),
    },
  },
  editorAndPopover: {
    getSortDirectionLegend: () =>
      i18n.translate('unifiedSearch.optionsList.popover.sortDirections', {
        defaultMessage: 'Sort directions',
      }),
    adhoc: {
      getTemporaryDataviewLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.temporaryDataviewLabel', {
          defaultMessage: 'Temporary',
        }),
    },
    managed: {
      getManagedDataviewLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.managedDataviewLabel', {
          defaultMessage: 'Managed',
        }),
    },
    search: {
      getSearchPlaceholder: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.findDataView', {
          defaultMessage: 'Find a data view',
        }),
    },
    copyName: {
      getCopyNameLabel: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.copyDataViewNameButton', {
          defaultMessage: 'Copy data view name to clipboard',
        }),
      getCopiedToastTitle: () =>
        i18n.translate('unifiedSearch.query.queryBar.indexPattern.dataViewNameCopiedToast', {
          defaultMessage: 'Data view name copied to clipboard',
        }),
    },
  },
};

const DIRECTION_OPTIONS = [SortDirection.ASC, SortDirection.DESC].map((key) => {
  return {
    id: key,
    iconType: `sort${toSentenceCase(key)}ending`,
    label: strings.sortOrder[key].getSortOrderLabel(),
  };
});

export const getAlphabeticalComparable = (item: DataViewListItemEnhanced) =>
  item.name || item.title;

export interface DataViewListItemEnhanced extends DataViewListItem {
  isAdhoc?: boolean;
}

export interface DataViewsListProps {
  dataViewsList: DataViewListItemEnhanced[];
  onChangeDataView: (newId: string) => void;
  currentDataViewId?: string;
  selectableProps?: EuiSelectableProps;
  searchListInputId?: string;
}

const rowCopyIconCss = css`
  .dataViewListCopyBtn {
    /* EUI list rows disable pointer events on appended content; re-enable for the action */
    pointer-events: auto;
    /* hidden until the row is hovered or keyboard-focused (visibility keeps it clickable + layout stable) */
    visibility: hidden;
  }

  .euiSelectableListItem:hover .dataViewListCopyBtn,
  .euiSelectableListItem:focus-within .dataViewListCopyBtn,
  .euiSelectableListItem-isFocused .dataViewListCopyBtn {
    visibility: visible;
  }
`;

export function DataViewsList({
  dataViewsList,
  onChangeDataView,
  currentDataViewId,
  selectableProps,
  searchListInputId,
}: DataViewsListProps) {
  const storage = useRef(new Storage(window.localStorage));

  const kibana = useKibana<IUnifiedSearchPluginServices>();
  const { notifications } = kibana.services;

  const onCopyRowName = useCallback(
    (label: string) => {
      copyToClipboard(label);
      notifications?.toasts?.addSuccess({
        title: strings.editorAndPopover.copyName.getCopiedToastTitle(),
        text: label,
      });
    },
    [notifications]
  );

  const [direction, setDirection] = useState<Direction>(sort.load(storage.current).direction);

  const sortedDataViewsList = useMemo(
    () =>
      sort.sortData<DataViewListItemEnhanced>(
        // Don't show ES|QL ad hoc data views in the data view list
        dataViewsList.filter((dataView) => !dataView.isAdhoc || dataView.type !== ESQL_TYPE),
        direction,
        getAlphabeticalComparable
      ),
    [dataViewsList, direction]
  );

  const onChangeSortDirection = useCallback((value: string) => {
    setDirection(value as Direction);
    sort.save(storage.current, value as Direction);
  }, []);

  return (
    <EuiSelectable<{
      key?: string;
      label: string;
      value?: string;
      checked?: 'on' | 'off' | undefined;
    }>
      {...selectableProps}
      listProps={{
        truncationProps: MIDDLE_TRUNCATION_PROPS,
        paddingSize: 's',
        ...(selectableProps?.listProps ? selectableProps.listProps : undefined),
      }}
      data-test-subj="indexPattern-switcher"
      searchable
      singleSelection="always"
      options={sortedDataViewsList?.map(({ title, id, name, isAdhoc, managed }) => {
        const displayName = name ? name : title;
        return {
          key: id,
          label: displayName,
          value: id,
          checked: id === currentDataViewId ? 'on' : undefined,
          'data-test-subj': `dataView-${displayName}`,
          append: (
            <>
              <EuiToolTip
                content={strings.editorAndPopover.copyName.getCopyNameLabel()}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  className="dataViewListCopyBtn"
                  iconType="copy"
                  color="text"
                  size="xs"
                  aria-label={strings.editorAndPopover.copyName.getCopyNameLabel()}
                  data-test-subj={`dataViewCopyName-${displayName}`}
                  onClick={(e: React.MouseEvent) => {
                    // prevent the row's onChange from switching the selected data view
                    e.stopPropagation();
                    onCopyRowName(displayName);
                  }}
                />
              </EuiToolTip>
              {managed ? (
                <EuiBadge color="hollow" data-test-subj={`dataViewItemManagedBadge-${name}`}>
                  {strings.editorAndPopover.managed.getManagedDataviewLabel()}
                </EuiBadge>
              ) : isAdhoc ? (
                <EuiBadge color="hollow" data-test-subj={`dataViewItemTempBadge-${name}`}>
                  {strings.editorAndPopover.adhoc.getTemporaryDataviewLabel()}
                </EuiBadge>
              ) : null}
            </>
          ),
        };
      })}
      onChange={(choices) => {
        const choice = choices.find(({ checked }) => checked) as unknown as {
          value: string;
        };
        onChangeDataView(choice.value);
      }}
      searchProps={{
        id: searchListInputId,
        compressed: true,
        placeholder: strings.editorAndPopover.search.getSearchPlaceholder(),
        'data-test-subj': 'indexPattern-switcher--input',
        autoFocus: false, // focused manually below - see https://github.com/elastic/eui/issues/8287
        inputRef: (ref) => {
          ref?.focus({ preventScroll: true });
        },
        ...(selectableProps ? selectableProps.searchProps : undefined),
      }}
    >
      {(list, search) => (
        <>
          <EuiPanel
            css={css`
              padding-bottom: 0;
            `}
            color="transparent"
            paddingSize="s"
          >
            <EuiFlexGroup
              gutterSize="xs"
              direction="row"
              justifyContent="spaceBetween"
              alignItems="center"
              responsive={false}
            >
              <EuiFlexItem>{search}</EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  isIconOnly
                  buttonSize="compressed"
                  options={DIRECTION_OPTIONS}
                  legend={strings.editorAndPopover.getSortDirectionLegend()}
                  idSelected={direction}
                  onChange={onChangeSortDirection}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <div css={rowCopyIconCss}>{list}</div>
        </>
      )}
    </EuiSelectable>
  );
}
