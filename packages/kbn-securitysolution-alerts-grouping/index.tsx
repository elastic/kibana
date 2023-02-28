/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { GroupsSelector, GroupSelectorProps, isNoneGroup } from './src/components';
import { GroupedTables, GroupedTablesProps } from './src/components/grouped_tables';
interface AlertsGroupingProps {
  hi: string;
}
export const getAlertsGroupingTable = (
  props: AlertsGroupingProps
): React.ReactElement<AlertsGroupingProps> => <div>{`hi ${props.hi}`}</div>;

export const getGroupedTables = (
  props: GroupedTablesProps
): React.ReactElement<GroupedTablesProps> => <GroupedTables {...props} />;

export const getGroupSelector = (
  props: GroupSelectorProps
): React.ReactElement<GroupSelectorProps> => <GroupsSelector {...props} />;

export { isNoneGroup };
