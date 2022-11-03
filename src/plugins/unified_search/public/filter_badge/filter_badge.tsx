/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiIcon, EuiTextColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { isCombinedFilter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FilterBadgeGroup } from './filter_badge_group';
import { FilterLabelStatus } from '../filter_bar/filter_item/filter_item';
import { FilterBadgeContextType } from './filter_badge_context';
import { getBooleanRelationType } from '../utils';

export interface FilterBadgeProps {
  filter: Filter;
  dataViews: DataView[];
  valueLabel: string;
  hideAlias?: boolean;
  filterLabelStatus: FilterLabelStatus;
}

function FilterBadge({
  filter,
  dataViews,
  valueLabel,
  hideAlias,
  filterLabelStatus,
  ...rest
}: FilterBadgeProps) {
  const { euiTheme } = useEuiTheme();

  const rootLevelConditionType = getBooleanRelationType(filter);

  const badgePading = useMemo(
    () => css`
      padding: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
    `,
    [euiTheme.size.xs, euiTheme.size.xxs]
  );

  const marginLeftLabel = useMemo(
    () => css`
      margin-left: ${euiTheme.size.xs};
    `,
    [euiTheme.size.xs]
  );

  if (!dataViews.length) {
    return null;
  }

  const prefixText = filter.meta.negate
    ? ` ${i18n.translate('unifiedSearch.filter.filterBar.negatedFilterPrefix', {
        defaultMessage: 'NOT ',
      })}`
    : '';

  const prefix =
    filter.meta.negate && !filter.meta.disabled ? (
      <EuiTextColor color="danger">{prefixText}</EuiTextColor>
    ) : (
      prefixText
    );

  const getValue = (text?: string) => {
    return <span className="globalFilterLabel__value">{text}</span>;
  };

  return (
    <EuiBadge className={badgePading} color="hollow" iconType="cross" iconSide="right" {...rest}>
      {!hideAlias && filter.meta.alias !== null ? (
        <>
          <EuiIcon type="save" size="s" />
          <span className={marginLeftLabel}>
            {prefix}
            {filter.meta.alias}
            {filterLabelStatus && <>: {getValue(valueLabel)}</>}
          </span>
        </>
      ) : (
        <FilterBadgeContextType.Provider
          value={{
            dataViews,
            filterLabelStatus: valueLabel,
            isRootCombinedFilterNegate: filter.meta.negate,
          }}
        >
          <div>
            {isCombinedFilter(filter) ? prefix : null}
            <FilterBadgeGroup
              filters={[filter]}
              booleanRelation={rootLevelConditionType}
              isRootLevel={true}
            />
          </div>
        </FilterBadgeContextType.Provider>
      )}
    </EuiBadge>
  );
}

// React.lazy support
// eslint-disable-next-line import/no-default-export
export default FilterBadge;
