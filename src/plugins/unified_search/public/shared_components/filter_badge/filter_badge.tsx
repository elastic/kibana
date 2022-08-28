/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import { DataView } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import { FilterBadgeGroup } from './filter_badge_group';
import { ConditionTypes } from '../../filters_builder/filters_builder_condition_types';

export interface FilterBadgeProps {
  filters: Filter[];
  dataView: DataView;
  iconOnClick: () => void;
  onClick: () => void;
}

const cursor = css`
  padding: 7px;
`;

const rootLevelConditionType = ConditionTypes.AND;

export function FilterBadge({ filters, dataView, iconOnClick, onClick }: FilterBadgeProps) {
  const iconOnClickBadge = useCallback(() => iconOnClick(), [iconOnClick]);
  const onClickBadge = useCallback(() => onClick(), [onClick]);

  if (!dataView) {
    return null;
  }

  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiBadge
          className={cursor}
          color="hollow"
          iconType="cross"
          iconSide="right"
          iconOnClick={() => iconOnClickBadge()}
          onClickAriaLabel="Filter actions"
          iconOnClickAriaLabel="Remove filter"
          onClick={() => onClickBadge()}
          title=""
        >
          <EuiFlexGroup wrap responsive={false} gutterSize="xs">
            <FilterBadgeGroup
              filters={filters}
              dataView={dataView}
              conditionType={rootLevelConditionType}
            />
          </EuiFlexGroup>
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
