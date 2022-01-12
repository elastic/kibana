/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiFlexItem, useInnerText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';
import React, { FC } from 'react';
import type { Filter } from '@kbn/es-query';
import { IIndexPattern } from '../..';
import { getDisplayValueFromFilter } from '../../query';

interface Props {
  groupedFilters: any;
  indexPatterns: IIndexPattern[];
  onClick: (filter: Filter) => void;
  groupId: string;
}

export const FilterExpressionItem: FC<Props> = ({
  groupedFilters,
  indexPatterns,
  onClick,
  groupId,
}: Props) => {
  const [ref] = useInnerText();
  let filterText = '';
  const groupBySubgroups = groupBy(groupedFilters, 'subGroupId');
  for (const [_, subGroupedFilters] of Object.entries(groupBySubgroups)) {
    for (const filter of subGroupedFilters) {
      const text = getDisplayValueFromFilter(filter, indexPatterns);
      filterText += `${filter?.meta?.key}: ${text} ${
        groupedFilters.length > 1 ? filter.relationship || '' : ''
      } `;
    }
  }

  const badge = (
    <EuiFlexItem key={groupId} grow={false} className="globalFilterBar__flexItem">
      <EuiBadge
        title={filterText}
        color="hollow"
        iconType="cross"
        iconSide="right"
        style={{ cursor: 'pointer', padding: '5px' }}
        closeButtonProps={{
          tabIndex: -1,
        }}
        // iconOnClick={() => onClick(savedQuery)}
        // iconOnClickAriaLabel={i18n.translate(
        //   'data.filter.filterBar.savedQueryBadgeIconAriaLabel',
        //   {
        //     defaultMessage: 'Remove {title}',
        //     values: { title: savedQuery.attributes.title },
        //   }
        // )}
        // onClickAriaLabel={i18n.translate('data.filter.filterBar.savedQueryBadgeAriaLabel', {
        //   defaultMessage: 'Selected saved objects actions',
        // })}
        // onClick={() => onClick(savedQuery)}
      >
        <div ref={ref}>
          <span>{filterText}</span>
        </div>
      </EuiBadge>
    </EuiFlexItem>
  );

  return badge;
};
