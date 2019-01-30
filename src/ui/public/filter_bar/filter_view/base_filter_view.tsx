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

import { EuiBadge } from '@elastic/eui';
import { Filter, isFilterPinned } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { SFC } from 'react';

interface Props {
  filter: Filter;
  title: string;
  [propName: string]: any;
}

export const BaseFilterView: SFC<Props> = ({ filter, title, children, ...rest }: Props) => {
  let badgeTitle = `Filter: ${
    filter.meta.negate
      ? ` ${i18n.translate('common.ui.filterBar.negatedFilterPrefix', {
          defaultMessage: 'NOT ',
        })}`
      : ''
  }${title}. ${i18n.translate('common.ui.filterBar.moreFilterActionsMessage', {
    defaultMessage: 'Select for more filter actions.',
  })}`;

  if (isFilterPinned(filter)) {
    badgeTitle = `${i18n.translate('common.ui.filterBar.pinnedFilterPrefix', {
      defaultMessage: 'Pinned',
    })} ${badgeTitle}`;
  }
  if (filter.meta.disabled) {
    badgeTitle = `${i18n.translate('common.ui.filterBar.disabledFilterPrefix', {
      defaultMessage: 'Disabled',
    })} ${badgeTitle}`;
  }

  return (
    <EuiBadge
      title={badgeTitle}
      iconType="cross"
      // @ts-ignore
      iconSide="right"
      closeButtonProps={{
        // Removing tab focus on close button because the same option can be optained through the context menu
        // Also, we may want to add a `DEL` keyboard press functionality
        tabIndex: '-1',
      }}
      iconOnClickAriaLabel={i18n.translate('common.ui.filterBar.filterItemBadgeIconAriaLabel', {
        defaultMessage: 'Delete',
      })}
      onClickAriaLabel={i18n.translate('common.ui.filterBar.filterItemBadgeAriaLabel', {
        defaultMessage: 'Filter actions',
      })}
      {...rest}
    >
      <span>
        {filter.meta.negate ? (
          <FormattedMessage id="common.ui.filterBar.negatedFilterPrefix" defaultMessage="NOT " />
        ) : (
          ''
        )}
        {children}
      </span>
    </EuiBadge>
  );
};
