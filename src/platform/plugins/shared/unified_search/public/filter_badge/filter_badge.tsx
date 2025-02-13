/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiTextBlockTruncate, EuiTextColor, useEuiTheme } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { isCombinedFilter } from '@kbn/es-query';
import { css } from '@emotion/react';
import { FilterBadgeGroup } from './filter_badge_group';
import type { FilterLabelStatus } from '../filter_bar/filter_item/filter_item';
import { badgePaddingCss, marginLeftLabelCss } from './filter_badge.styles';
import { strings } from './i18n';

export interface FilterBadgeProps {
  filter: Filter;
  dataViews: DataView[];
  valueLabel: string;
  hideAlias?: boolean;
  filterLabelStatus: FilterLabelStatus;
  readOnly?: boolean;
}

function FilterBadge({
  filter,
  dataViews,
  valueLabel,
  hideAlias,
  filterLabelStatus,
  readOnly,
  ...rest
}: FilterBadgeProps) {
  const { euiTheme } = useEuiTheme();

  if (!dataViews.length) {
    return null;
  }

  const prefixText = filter.meta.negate ? ` ${strings.getNotLabel()}` : '';

  const prefix =
    filter.meta.negate && !filter.meta.disabled ? (
      <EuiTextColor color="danger">{prefixText}</EuiTextColor>
    ) : (
      prefixText
    );

  const filterLabelValue = <span className="globalFilterLabel__value">{valueLabel}</span>;

  return (
    <EuiBadge
      className={badgePaddingCss(euiTheme)}
      color="hollow"
      iconType={readOnly ? 'cross' : undefined}
      iconSide="right"
      {...rest}
    >
      <span
        css={css`
          white-space: normal;
          overflow-wrap: break-word;
        `}
      >
        <EuiTextBlockTruncate lines={10}>
          {filter.meta.alias && !hideAlias ? (
            <>
              <span className={marginLeftLabelCss(euiTheme)}>
                {prefix}
                {filter.meta.alias}
                {filterLabelStatus && <>: {filterLabelValue}</>}
              </span>
            </>
          ) : (
            <div>
              {isCombinedFilter(filter) && prefix}
              <FilterBadgeGroup
                filters={[filter]}
                dataViews={dataViews}
                filterLabelStatus={valueLabel}
              />
            </div>
          )}
        </EuiTextBlockTruncate>
      </span>
    </EuiBadge>
  );
}

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default FilterBadge;
