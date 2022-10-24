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
  useEuiBackgroundColor,
  useEuiPaddingSize,
} from '@elastic/eui';
import { type Filter, BooleanRelation } from '@kbn/es-query';
import { css, cx } from '@emotion/css';
import type { Path } from './filters_builder_types';
import { getBooleanRelationType } from '../utils';
import { FilterItem } from './filters_builder_filter_item';
import { FiltersBuilderContextType } from './filters_builder_context';
import { getPathInArray } from './filters_builder_utils';

export interface FilterGroupProps {
  filters: Filter[];
  booleanRelation: BooleanRelation;
  path: Path;

  /** @internal used for recursive rendering **/
  renderedLevel?: number;
  reverseBackground?: boolean;
}

/** @internal **/
const Delimiter = ({
  color,
  booleanRelation,
}: {
  color: 'subdued' | 'plain';
  booleanRelation: BooleanRelation;
}) => {
  const xsPadding = useEuiPaddingSize('xs');
  const mPadding = useEuiPaddingSize('m');
  const backgroundColor = useEuiBackgroundColor(color);

  const delimiterStyles = useMemo(
    () => css`
      position: relative;

      .filter-builder__delimiter_text {
        position: absolute;
        display: block;
        padding: ${xsPadding};
        top: 0;
        left: ${mPadding};
        background: ${backgroundColor};
      }
    `,
    [backgroundColor, mPadding, xsPadding]
  );

  return (
    <div className={delimiterStyles}>
      <EuiHorizontalRule margin="s" />
      <EuiText size="xs" className="filter-builder__delimiter_text">
        {i18n.translate('unifiedSearch.filter.filtersBuilder.delimiterLabel', {
          defaultMessage: '{booleanRelation}',
          values: {
            booleanRelation,
          },
        })}
      </EuiText>
    </div>
  );
};

export const FilterGroup = ({
  filters,
  booleanRelation,
  path,
  reverseBackground = false,
  renderedLevel = 0,
}: FilterGroupProps) => {
  const {
    globalParams: { maxDepth, hideOr },
  } = useContext(FiltersBuilderContextType);

  const pathInArray = getPathInArray(path);
  const isDepthReached = maxDepth <= pathInArray.length;
  const orDisabled = hideOr || (isDepthReached && booleanRelation === BooleanRelation.AND);
  const andDisabled = isDepthReached && booleanRelation === BooleanRelation.OR;

  const removeDisabled = pathInArray.length <= 1 && filters.length === 1;
  const shouldNormalizeFirstLevel =
    !path && filters.length === 1 && getBooleanRelationType(filters[0]);

  if (shouldNormalizeFirstLevel) {
    reverseBackground = true;
    renderedLevel -= 1;
  }

  const color = reverseBackground ? 'plain' : 'subdued';

  const renderedFilters = filters.map((filter, index, acc) => (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <FilterItem
          filter={filter}
          path={`${path}${path ? '.' : ''}${index}`}
          reverseBackground={reverseBackground}
          disableOr={orDisabled}
          disableAnd={andDisabled}
          disableRemove={removeDisabled}
          color={color}
          index={index}
          renderedLevel={renderedLevel}
        />
      </EuiFlexItem>

      {booleanRelation && index + 1 < acc.length ? (
        <EuiFlexItem>
          {booleanRelation === BooleanRelation.OR && (
            <Delimiter color={color} booleanRelation={booleanRelation} />
          )}
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ));

  return shouldNormalizeFirstLevel ? (
    <>{renderedFilters}</>
  ) : (
    <EuiPanel
      color={color}
      hasShadow={false}
      paddingSize={renderedLevel > 0 ? 'none' : 'xs'}
      hasBorder
      className={cx({
        'filter-builder__panel': true,
        'filter-builder__panel-nested': renderedLevel > 0,
      })}
    >
      {renderedFilters}
    </EuiPanel>
  );
};
