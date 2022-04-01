/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiBadgeProps, useInnerText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { Filter, isFilterPinned } from '@kbn/es-query';
import { FilterLabel } from '../';
import type { FilterLabelStatus } from '../filter_item';

interface Props {
  filter: Filter;
  valueLabel: string;
  filterLabelStatus: FilterLabelStatus;
  errorMessage?: string;
  readonly?: boolean;
  hideAlias?: boolean;
  [propName: string]: any;
}

export const FilterView: FC<Props> = ({
  filter,
  iconOnClick,
  onClick,
  valueLabel,
  errorMessage,
  filterLabelStatus,
  readonly,
  hideAlias,
  ...rest
}: Props) => {
  const [ref, innerText] = useInnerText();

  let title =
    errorMessage ||
    i18n.translate('unifiedSearch.filter.filterBar.moreFilterActionsMessage', {
      defaultMessage: 'Filter: {innerText}. Select for more filter actions.',
      values: { innerText },
    });

  if (isFilterPinned(filter)) {
    title = `${i18n.translate('unifiedSearch.filter.filterBar.pinnedFilterPrefix', {
      defaultMessage: 'Pinned',
    })} ${title}`;
  }
  if (filter.meta.disabled) {
    title = `${i18n.translate('unifiedSearch.filter.filterBar.disabledFilterPrefix', {
      defaultMessage: 'Disabled',
    })} ${title}`;
  }

  const badgeProps: EuiBadgeProps = readonly
    ? {
        title,
        color: 'hollow',
        onClick,
        onClickAriaLabel: i18n.translate('data.filter.filterBar.filterItemReadOnlyBadgeAriaLabel', {
          defaultMessage: 'Filter entry',
        }),
        iconOnClick,
      }
    : {
        title,
        color: 'hollow',
        iconType: 'cross',
        iconSide: 'right',
        closeButtonProps: {
          // Removing tab focus on close button because the same option can be obtained through the context menu
          // Also, we may want to add a `DEL` keyboard press functionality
          tabIndex: -1,
        },
        iconOnClick,
        iconOnClickAriaLabel: i18n.translate('data.filter.filterBar.filterItemBadgeIconAriaLabel', {
          defaultMessage: 'Delete {filter}',
          values: { filter: innerText },
        }),
        onClick,
        onClickAriaLabel: i18n.translate('data.filter.filterBar.filterItemBadgeAriaLabel', {
          defaultMessage: 'Filter actions',
        }),
      };

  return (
    <EuiBadge {...badgeProps} {...rest}>
      <span ref={ref}>
        <FilterLabel
          filter={filter}
          valueLabel={valueLabel}
          filterLabelStatus={filterLabelStatus}
          hideAlias={hideAlias}
        />
      </span>
    </EuiBadge>
  );
};
