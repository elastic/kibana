/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { ConditionTypes } from './filters_editor_condition_types';
import { FilterItem } from './filters_editor_filter_item';
import type { Path } from './filter_editors_types';

export interface FilterGroupProps {
  filters: Filter[];
  conditionType: ConditionTypes;
  path: Path;
}

const Delimiter = ({ conditionType }: { conditionType: ConditionTypes }) => (
  <code>Delimiter {conditionType}</code>
);

export const FilterGroup = ({ filters, conditionType, path }: FilterGroupProps) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    {filters.map((filter, index, acc) => (
      <EuiFlexItem>
        <FilterItem filter={filter} path={`${path ? path + '.' : ''}${index}`} />
        {index + 1 < acc.length ? <Delimiter conditionType={conditionType} /> : null}
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
