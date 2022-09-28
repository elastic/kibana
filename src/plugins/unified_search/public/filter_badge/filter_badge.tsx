/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, useEuiPaddingSize } from '@elastic/eui';
import { css } from '@emotion/css';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { FilterBadgeGroup } from './filter_badge_group';
import { ConditionTypes } from '../utils';

export interface FilterBadgeProps {
  filters: Filter[];
  dataView: DataView;
  iconOnClick: () => void;
  onClick: () => void;
}

const rootLevelConditionType = ConditionTypes.AND;

function FilterBadge({ filters, dataView, iconOnClick, onClick }: FilterBadgeProps) {
  const sPaddingSize = useEuiPaddingSize('s');

  const badgePadiing = useMemo(
    () => css`
      padding: ${sPaddingSize};
    `,
    [sPaddingSize]
  );

  if (!dataView) {
    return null;
  }

  return (
    <EuiBadge
      className={badgePadiing}
      color="hollow"
      iconType="cross"
      iconSide="right"
      iconOnClick={iconOnClick}
      onClickAriaLabel="Filter actions"
      iconOnClickAriaLabel="Remove filter"
      onClick={onClick}
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
  );
}

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default FilterBadge;
