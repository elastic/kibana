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
import { FilterLabel } from '..';
import type { FilterLabelStatus } from '../filter_item/filter_item';

interface Props {
  filter: Filter;
  readOnly: boolean;
  valueLabel: string;
  fieldLabel?: string;
  filterLabelStatus: FilterLabelStatus;
  errorMessage?: string;
  hideAlias?: boolean;
  [propName: string]: any;
}

export const FilterView: FC<Props> = ({
  filter,
  readOnly,
  iconOnClick,
  onClick,
  valueLabel,
  fieldLabel,
  errorMessage,
  filterLabelStatus,
  hideAlias,
  ...rest
}: Props) => {
  const [ref, innerText] = useInnerText();

  const actionText = i18n.translate('unifiedSearch.filter.filterBar.filterActionsMessage', {
    defaultMessage: 'Select for more filter actions.',
  });
  const filterString = i18n.translate('unifiedSearch.filter.filterBar.filterString', {
    defaultMessage: 'Filter: {innerText}.',
    values: { innerText },
  });

  let title: string = errorMessage || (readOnly ? filterString : filterString + ' ' + actionText);

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

  const readOnlyProps = { title, color: 'hollow' };

  const badgeProps: EuiBadgeProps = readOnly
    ? readOnlyProps
    : {
        ...readOnlyProps,
        iconType: 'cross',
        iconSide: 'right',
        closeButtonProps: {
          // Removing tab focus on close button because the same option can be obtained through the context menu
          // Also, we may want to add a `DEL` keyboard press functionality
          tabIndex: -1,
        },
        iconOnClick,
        iconOnClickAriaLabel: i18n.translate(
          'unifiedSearch.filter.filterBar.filterItemBadgeIconAriaLabel',
          {
            defaultMessage: 'Delete {filter}',
            values: { filter: innerText },
          }
        ),
        onClick,
        onClickAriaLabel: i18n.translate(
          'unifiedSearch.filter.filterBar.filterItemBadgeAriaLabel',
          {
            defaultMessage: 'Filter actions',
          }
        ),
      };

  return (
    <EuiBadge {...badgeProps} {...rest}>
      <span ref={ref}>
        <FilterLabel
          filter={filter}
          valueLabel={valueLabel}
          fieldLabel={fieldLabel}
          filterLabelStatus={filterLabelStatus}
          hideAlias={hideAlias}
        />
      </span>
    </EuiBadge>
  );
};
