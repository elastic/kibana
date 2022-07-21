/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { Filter } from '@kbn/es-query';
import { ConditionTypes } from './filters_editor_condition_types';
import { FilterItem } from './filters_editor_filter_item';

export interface FilterGroupProps {
  filters: Filter[];
  conditionType: ConditionTypes;
}

const Delimiter = ({ conditionType }: { conditionType: ConditionTypes }) => (
  <h2>Delimiter {conditionType}</h2>
);

export const FilterGroup = ({ filters, conditionType }: FilterGroupProps) => (
  <>
    {filters.map((filter, index, acc) => (
      <>
        <FilterItem filter={filter} />
        {index + 1 < acc.length ? <Delimiter conditionType={conditionType} /> : null}
      </>
    ))}
  </>
);
