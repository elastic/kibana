/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  useEuiBackgroundColor,
  useEuiPaddingSize,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { BooleanRelation, type Filter } from '@kbn/es-query';
import { cx } from '@emotion/css';
import type { Path } from './types';
import { getBooleanRelationType } from '../utils';
import { FilterItem } from './filter_item';
import { FiltersBuilderContextType } from './context';
import { getPathInArray } from './utils';
import { delimiterCss } from './filter_group.styles';

export const strings = {
  getDelimiterLabel: (booleanRelation: BooleanRelation) =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.delimiterLabel', {
      defaultMessage: '{booleanRelation}',
      values: {
        booleanRelation,
      },
    }),
};

export interface FilterGroupProps {
  filters: Filter[];
  booleanRelation: BooleanRelation;
  path: Path;

  /** @internal used for recursive rendering **/
  renderedLevel?: number;
  reverseBackground?: boolean;
  filtersCount?: number;
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
  return (
    <div
      className={delimiterCss({ padding: xsPadding, left: mPadding, background: backgroundColor })}
    >
      <EuiHorizontalRule margin="xs" />
      <EuiText size="xs" className="filter-builder__delimiter_text">
        {strings.getDelimiterLabel(booleanRelation)}
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
  filtersCount,
}: FilterGroupProps) => {
  const {
    globalParams: { maxDepth, hideOr },
  } = useContext(FiltersBuilderContextType);

  const pathInArray = getPathInArray(path);
  const isDepthReached = maxDepth <= pathInArray.length && renderedLevel > 0;
  const orDisabled = hideOr || (isDepthReached && booleanRelation === BooleanRelation.AND);
  const andDisabled = isDepthReached && booleanRelation === BooleanRelation.OR;

  const removeDisabled =
    pathInArray.length <= 1 &&
    filters !== undefined &&
    Array.isArray(filters) &&
    filters.length === 1;
  const shouldNormalizeFirstLevel =
    !path &&
    filters &&
    Array.isArray(filters) &&
    filters.length === 1 &&
    getBooleanRelationType(filters[0]);

  if (shouldNormalizeFirstLevel) {
    reverseBackground = true;
    renderedLevel -= 1;
  }

  const color = reverseBackground ? 'plain' : 'subdued';

  const renderedFilters =
    filters &&
    Array.isArray(filters) &&
    filters.map((filter, index, arrayRef) => {
      const showDelimiter = booleanRelation && index + 1 < arrayRef.length;
      return (
        <EuiFlexGroup
          key={index}
          direction="column"
          gutterSize={shouldNormalizeFirstLevel ? 'none' : 'xs'}
          responsive={false}
        >
          <EuiFlexItem>
            <FilterItem
              filter={filter}
              draggable={arrayRef.length !== 1}
              path={`${path}${path ? '.' : ''}${index}`}
              reverseBackground={reverseBackground}
              disableOr={orDisabled}
              disableAnd={andDisabled}
              disableRemove={removeDisabled}
              color={color}
              index={index}
              renderedLevel={renderedLevel}
              filtersCount={filtersCount}
            />
          </EuiFlexItem>

          {showDelimiter && (
            <EuiFlexItem>
              <Delimiter color={color} booleanRelation={booleanRelation} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    });

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
