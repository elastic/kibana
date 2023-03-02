/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  GroupSelectorProps,
  Grouping,
  GroupingProps,
  GroupSelector,
  RawBucket,
  getGroupingQuery,
  isNoneGroup,
} from './src';
import type { NamedAggregation, GroupingFieldTotalAggregation, GroupingAggregation } from './src';

export const getGrouping = <T,>(props: GroupingProps<T>): React.ReactElement<GroupingProps<T>> => (
  <Grouping {...props} />
);

export const getGroupSelector = (
  props: GroupSelectorProps
): React.ReactElement<GroupSelectorProps> => <GroupSelector {...props} />;

export { isNoneGroup, getGroupingQuery };

export type { GroupingAggregation, GroupingFieldTotalAggregation, NamedAggregation, RawBucket };
