/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DefaultAppStateExtension } from '../../../types';

export const getDefaultSecuritySolutionAppState: () => DefaultAppStateExtension = () => ({
  breakdownField: 'kibana.alert.workflow_status',
  columns: [
    {
      name: '@timestamp',
      width: 218,
    },
    {
      name: 'kibana.alert.workflow_status',
      width: 218,
    },
    {
      name: 'message',
      width: 360,
    },
    {
      name: 'event.category',
    },
    {
      name: 'event.action',
    },
    {
      name: 'host.name',
    },
    {
      name: 'source.ip',
    },
    {
      name: 'destination.ip',
    },
    {
      name: 'user.name',
    },
  ],
});
