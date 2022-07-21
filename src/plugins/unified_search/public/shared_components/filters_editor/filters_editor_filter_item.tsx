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
import { FilterGroup } from './filters_editor_filter_group';
import { isConditionalFilter } from './filters_editor_utils';
import { ConditionTypes } from './filters_editor_condition_types';

export interface FilterItemProps {
  filter: Filter;
}

export function FilterItem({ filter }: FilterItemProps) {
  const isConditional = isConditionalFilter(filter);

  return isConditional ? (
    <FilterGroup conditionType={ConditionTypes.OR} filters={filter.meta.params.filters} />
  ) : (
    <>
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem>{JSON.stringify(filter)}</EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
