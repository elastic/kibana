/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
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
import { css } from '@emotion/css';
import type { Path } from './filter_editors_types';
import { ConditionTypes } from './filters_editor_condition_types';
import { FilterItem } from './filters_editor_filter_item';
import { FiltersEditorContextType } from './filters_editor_context';
import { getPathInArray } from './filters_editor_utils';

export interface FilterGroupProps {
  filters: Filter[];
  conditionType: ConditionTypes;
  path: Path;
  timeRangeForSuggestionsOverride: boolean;
  reverseBackground?: boolean;
}

const Delimiter = ({ conditionType }: { conditionType: ConditionTypes }) =>
  conditionType === ConditionTypes.OR ? (
    <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center">
      <EuiFlexItem grow={1}>
        <EuiHorizontalRule margin="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          color="subdued"
          className={css`
            color: $euiColorLightShade;
            font-size: 13px;
            padding: 3px 6px;
          `}
        >
          {i18n.translate('unifiedSearch.filter.filtersEditor.orDelimiterLabel', {
            defaultMessage: 'OR',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        <EuiHorizontalRule margin="s" />
      </EuiFlexItem>{' '}
    </EuiFlexGroup>
  ) : null;

export const FilterGroup = ({
  filters,
  conditionType,
  path,
  timeRangeForSuggestionsOverride = false,
  reverseBackground = false,
}: FilterGroupProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    globalParams: { maxDepth, disableOr, disableAnd },
  } = useContext(FiltersEditorContextType);

  const pathInArray = getPathInArray(path);

  const isDepthReached = maxDepth === pathInArray.length;
  const orDisabled = disableOr || (isDepthReached && conditionType === ConditionTypes.AND);
  const andDisabled = disableAnd || (isDepthReached && conditionType === ConditionTypes.OR);
  const removeDisabled = pathInArray.length <= 1 && filters.length === 1;

  return (
    <EuiPanel
      color="subdued"
      paddingSize="s"
      className={css`
        border-radius: $euiBorderRadius;
        box-shadow: inset 0 0 0 1px rgba(17, 43, 134, 0.1);
        padding: 12px;
        background-color: ${reverseBackground
          ? euiTheme.colors.lightestShade
          : euiTheme.colors.emptyShade};
      `}
    >
      {filters.map((filter, index, acc) => (
        <>
          <EuiFlexGroup direction="column" gutterSize="m">
            <FilterItem
              filter={filter}
              path={`${path}${path ? '.' : ''}${index}`}
              timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
              reverseBackground={reverseBackground}
              disableOr={orDisabled}
              disableAnd={andDisabled}
              disableRemove={removeDisabled}
            />
          </EuiFlexGroup>
          {index + 1 < acc.length ? <Delimiter conditionType={conditionType} /> : null}
        </>
      ))}
    </EuiPanel>
  );
};
