/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { css } from '@emotion/css';
import type { Path } from './filter_editors_types';
import { ConditionTypes } from './filters_editor_condition_types';
import { FilterItem } from './filters_editor_filter_item';

export interface FilterGroupProps {
  filters: Filter[];
  conditionType: ConditionTypes;
  path: Path;
}

const filterGroupCss = css`
  // temporary
  padding-left: 20px;
`;

const Delimiter = ({ conditionType }: { conditionType: ConditionTypes }) => (
  <EuiFlexGroup gutterSize="none" responsive={false}>
    <EuiFlexItem>
      <EuiHorizontalRule margin="s" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText color="subdued">
        {conditionType === ConditionTypes.OR
          ? i18n.translate('unifiedSearch.filter.filtersEditor.orDelimiterLabel', {
              defaultMessage: 'or',
            })
          : i18n.translate('unifiedSearch.filter.filtersEditor.orDelimiterLabel', {
              defaultMessage: 'and',
            })}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiHorizontalRule margin="s" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const FilterGroup = ({ filters, conditionType, path }: FilterGroupProps) => (
  <EuiFlexGroup className={filterGroupCss} direction="column" gutterSize="none">
    {filters.map((filter, index, acc) => (
      <>
        <FilterItem filter={filter} path={`${path ? path + '.' : ''}${index}`} />
        {index + 1 < acc.length ? <Delimiter conditionType={conditionType} /> : null}
      </>
    ))}
  </EuiFlexGroup>
);
