/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  GroupSelector,
  GroupSelectorProps,
  RawBucket,
  getGroupingQuery,
  isNoneGroup,
  useGrouping,
} from './src';
import type {
  GroupOption,
  GroupingAggregation,
  GroupingFieldTotalAggregation,
  NamedAggregation,
} from './src';

export const getGroupSelector = (
  props: GroupSelectorProps
): React.ReactElement<GroupSelectorProps> => <GroupSelector {...props} />;

export { getGroupingQuery, isNoneGroup, useGrouping };

export type {
  GroupOption,
  GroupingAggregation,
  GroupingFieldTotalAggregation,
  NamedAggregation,
  RawBucket,
};
