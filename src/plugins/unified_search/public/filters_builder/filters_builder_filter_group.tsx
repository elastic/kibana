/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { cx, css } from '@emotion/css';
import type { Path } from './filters_builder_types';
import { ConditionTypes, isOrFilter } from '../utils';
import { FilterItem } from './filters_builder_filter_item';
import { FiltersBuilderContextType } from './filters_builder_context';
import { getPathInArray } from './filters_builder_utils';

export interface FilterGroupProps {
  filters: Filter[];
  conditionType: ConditionTypes;
  path: Path;
  timeRangeForSuggestionsOverride?: boolean;
  reverseBackground?: boolean;
}

const boderPadding = css`
  padding: 14px;
`;

const maginAndFilterGroup = css`
  margin: 2px;
`;

const OrDelimiter = ({ isRootLevelFilterGroup }: { isRootLevelFilterGroup: boolean }) => (
  <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
    <EuiFlexItem
      grow={1}
      style={{ marginLeft: isRootLevelFilterGroup ? '4px' : '-10px', flexGrow: 0.12 }}
    >
      <EuiHorizontalRule margin="s" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" color="subdued">
        {i18n.translate('unifiedSearch.filter.filtersBuilder.orDelimiterLabel', {
          defaultMessage: 'OR',
        })}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={10} style={{ marginRight: isRootLevelFilterGroup ? '4px' : '-10px' }}>
      <EuiHorizontalRule margin="s" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const marginAndDelimiter = css`
  margin: 4px;
  block-size: 0px;
`;

const AndDelimiter = () => (
  <EuiFlexGroup>
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule className={marginAndDelimiter} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const FilterGroup = ({
  filters,
  conditionType,
  path,
  timeRangeForSuggestionsOverride,
  reverseBackground = false,
}: FilterGroupProps) => {
  const {
    globalParams: { maxDepth, hideOr },
  } = useContext(FiltersBuilderContextType);

  const { euiTheme } = useEuiTheme();

  const border = useMemo(
    () =>
      css`
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
      `,
    [euiTheme.border.thin, euiTheme.border.radius.medium]
  );

  const pathInArray = getPathInArray(path);
  const isDepthReached = maxDepth <= pathInArray.length;
  const orDisabled = hideOr || (isDepthReached && conditionType === ConditionTypes.AND);
  const andDisabled = isDepthReached && conditionType === ConditionTypes.OR;
  const removeDisabled = pathInArray.length <= 1 && filters.length === 1;
  const isRootLevelFilterGroup = pathInArray.length <= 1;

  const firstLevel = !path && filters.length === 1;
  let color: 'subdued' | 'plain' = 'subdued';

  if (!firstLevel) {
    color = !reverseBackground ? 'subdued' : 'plain';
  } else {
    reverseBackground = true;
  }

  const shouldDrawBorder = (filter: Filter) =>
    (path === '' && isOrFilter(filter) && filters.length !== 1) ||
    Array.isArray(filter) ||
    (!isRootLevelFilterGroup && (Array.isArray(filter) || isOrFilter(filter))) ||
    (isRootLevelFilterGroup && Array.isArray(filter));

  return (
    <EuiPanel
      color={color}
      hasShadow={false}
      paddingSize="none"
      className={cx({
        [boderPadding]: path !== '',
      })}
    >
      {filters.map((filter, index, acc) => (
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem
            className={cx({
              [border]: shouldDrawBorder(filter),
            })}
          >
            <FilterItem
              filter={filter}
              path={`${path}${path ? '.' : ''}${index}`}
              timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
              reverseBackground={reverseBackground}
              disableOr={orDisabled}
              disableAnd={andDisabled}
              disableRemove={removeDisabled}
              color={color}
              index={index}
            />
          </EuiFlexItem>

          {conditionType === ConditionTypes.OR && index + 1 < acc.length ? (
            <EuiFlexItem>
              <OrDelimiter isRootLevelFilterGroup={isRootLevelFilterGroup} />
            </EuiFlexItem>
          ) : null}

          {conditionType === ConditionTypes.AND && index + 1 < acc.length ? (
            <EuiFlexItem
              className={cx({
                [maginAndFilterGroup]: shouldDrawBorder(filter),
              })}
            >
              <AndDelimiter />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      ))}
    </EuiPanel>
  );
};
