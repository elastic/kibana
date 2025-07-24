/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchSessionsMgmtTable, columns } from '../components/table';

type GetColumnsFn = React.ComponentProps<typeof SearchSessionsMgmtTable>['getColumns'];

export const getColumns: GetColumnsFn = ({
  core,
  kibanaVersion,
  searchUsageCollector,
  api,
  onActionComplete,
}) => [
  columns.appIdColumn,
  columns.nameColumn({
    core,
    kibanaVersion,
    searchUsageCollector,
  }),
  columns.actionsColumn({
    core,
    api,
    onActionComplete,
    allowedActions: ['extend', 'rename', 'delete'],
  }),
];
