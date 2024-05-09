/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('kbn-alerts-ui-shared/groups');

export const updateGroups = actionCreator<{
  activeGroups?: string[];
  tableId: string;
  options?: Array<{ key: string; label: string }>;
}>('UPDATE_GROUPS');
