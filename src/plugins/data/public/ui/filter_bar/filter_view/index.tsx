/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiBadge, useInnerText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { FilterLabel } from '../filter_editor/lib/filter_label';
import { Filter, isFilterPinned } from '../../../../common';

interface Props {
  filter: Filter;
  valueLabel: string;
  [propName: string]: any;
}

export const FilterView: FC<Props> = ({
  filter,
  iconOnClick,
  onClick,
  valueLabel,
  ...rest
}: Props) => {
  const [ref, innerText] = useInnerText();

  let title = i18n.translate('data.filter.filterBar.moreFilterActionsMessage', {
    defaultMessage: 'Filter: {innerText}. Select for more filter actions.',
    values: { innerText },
  });

  if (isFilterPinned(filter)) {
    title = `${i18n.translate('data.filter.filterBar.pinnedFilterPrefix', {
      defaultMessage: 'Pinned',
    })} ${title}`;
  }
  if (filter.meta.disabled) {
    title = `${i18n.translate('data.filter.filterBar.disabledFilterPrefix', {
      defaultMessage: 'Disabled',
    })} ${title}`;
  }

  return (
    <EuiBadge
      title={title}
      color="hollow"
      iconType="cross"
      iconSide="right"
      closeButtonProps={{
        // Removing tab focus on close button because the same option can be optained through the context menu
        // Also, we may want to add a `DEL` keyboard press functionality
        tabIndex: -1,
      }}
      iconOnClick={iconOnClick}
      iconOnClickAriaLabel={i18n.translate('data.filter.filterBar.filterItemBadgeIconAriaLabel', {
        defaultMessage: 'Delete',
      })}
      onClick={onClick}
      onClickAriaLabel={i18n.translate('data.filter.filterBar.filterItemBadgeAriaLabel', {
        defaultMessage: 'Filter actions',
      })}
      {...rest}
    >
      <span ref={ref}>
        <FilterLabel filter={filter} valueLabel={valueLabel} />
      </span>
    </EuiBadge>
  );
};
