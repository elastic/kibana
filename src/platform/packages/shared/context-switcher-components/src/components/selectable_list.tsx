/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { EuiSelectable, useEuiTheme } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import classNames from 'classnames';
import { SELECTABLE_ROW_HEIGHT } from './types';

const SELECTABLE_LIST_CHECKED_ITEM_CLASS = 'kbnContextSwitcherSelectableListItem--checked';

type EuiSelectableChangeHandler = NonNullable<ComponentProps<typeof EuiSelectable>['onChange']>;
type EuiSelectableChangeEvent = Parameters<EuiSelectableChangeHandler>[1];

export interface SelectableListSearchConfig {
  readonly enabled: boolean;
  readonly props?: ComponentProps<typeof EuiSelectable>['searchProps'];
}

export interface SelectableListItem {
  readonly id: string;
  readonly label: string;
  readonly prepend?: ReactNode;
  readonly append?: ReactNode;
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly ['data-test-subj']?: string;
}

export interface SelectableListProps {
  readonly id: string;
  readonly items: ReadonlyArray<SelectableListItem>;
  readonly isLoading?: boolean;
  readonly loadingMessage?: string;
  readonly noMatchesMessage?: ReactElement;
  readonly search?: SelectableListSearchConfig;
  readonly onSelect: (args: {
    readonly item: SelectableListItem;
    readonly event: EuiSelectableChangeEvent;
    readonly previousSelectedId?: string;
  }) => void;
  readonly children?: (nodes: {
    readonly list: ReactNode;
    readonly search?: ReactNode;
  }) => ReactNode;
}

/**
 * Generic selectable list for context-switcher:
 * - Single selection (always)
 * - Optional search UI
 * - Supports prepend/append per item
 */
export const SelectableList = ({
  id,
  items,
  isLoading = false,
  loadingMessage,
  noMatchesMessage,
  search,
  onSelect,
  children,
}: SelectableListProps) => {
  const { euiTheme } = useEuiTheme();

  const previousSelectedId = useMemo(() => items.find((i) => i.checked)?.id, [items]);

  const itemById = useMemo(() => {
    const map = new Map<string, SelectableListItem>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const options: Array<EuiSelectableOption> = useMemo(
    () =>
      items.map((item) => ({
        key: item.id,
        label: item.label,
        prepend: item.prepend,
        append: item.append,
        checked: item.checked ? ('on' as const) : undefined,
        disabled: item.disabled,
        className: classNames(item.className, item.checked && SELECTABLE_LIST_CHECKED_ITEM_CLASS),
        'data-test-subj': item['data-test-subj'],
      })),
    [items]
  );

  const defaultNoMatchesMessage = (
    <FormattedMessage
      id="contextSwitcherComponents.selectableList.noMatchesFound"
      defaultMessage="No matches found"
    />
  );

  const handleChange = useCallback<EuiSelectableChangeHandler>(
    (newOptions, event) => {
      const selected = newOptions.find((o) => o.checked === 'on');
      const selectedId = selected?.key != null ? String(selected.key) : undefined;
      if (!selectedId) return;

      const item = itemById.get(selectedId);
      if (!item) return;

      onSelect({ item, event, previousSelectedId });
    },
    [itemById, onSelect, previousSelectedId]
  );

  const selectableStyles = css`
    /* no underline */
    .euiSelectableListItem:hover .euiSelectableListItem__text,
    .euiSelectableListItem.euiSelectableListItem-isFocused .euiSelectableListItem__text {
      text-decoration: none;
    }
    /* blue background color and rounded corners */
    .euiSelectableListItem {
      &:hover:not([aria-disabled='true']),
      &.euiSelectableListItem-isFocused:not([aria-disabled='true']),
      &.${SELECTABLE_LIST_CHECKED_ITEM_CLASS} {
        background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
        border-radius: ${euiTheme.border.radius.small};
      }
    }
    /* blue icon color */
    .euiSelectableListItem__icon {
      color: ${euiTheme.colors.textPrimary};
    }
    /* badges: no background + no border */
    .euiSelectableListItem__append .euiBadge:not(.euiSelectableListItem__onFocusBadge) {
      --euiBadgeTextColor: ${euiTheme.colors.textSubdued};
      background-color: transparent;
      border: 0;
      box-shadow: none;
    }
    /* no bottom border between items */
    .euiSelectableListItem:not(:last-of-type) {
      border-bottom: 0;
    }
  `;

  const searchableProps = search?.enabled
    ? { searchable: true as const, searchProps: search.props }
    : { searchable: false as const };

  return (
    <EuiSelectable
      id={id}
      options={options}
      singleSelection="always"
      onChange={handleChange}
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      noMatchesMessage={noMatchesMessage ?? defaultNoMatchesMessage}
      css={selectableStyles}
      listProps={{
        rowHeight: SELECTABLE_ROW_HEIGHT,
        showIcons: true,
        onFocusBadge: false,
      }}
      {...searchableProps}
    >
      {(list, searchNode) => {
        if (children) return <>{children({ list, search: searchNode ?? undefined })}</>;

        return (
          <>
            {searchNode}
            {list}
          </>
        );
      }}
    </EuiSelectable>
  );
};
