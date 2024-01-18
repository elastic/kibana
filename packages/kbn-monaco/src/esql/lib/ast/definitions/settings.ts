/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { CommandModeDefinition } from './types';

export const ccqMode: CommandModeDefinition = {
  name: 'ccq.mode',
  description: i18n.translate('monaco.esql.definitions.ccqModeDoc', {
    defaultMessage: 'Cross-clusters query mode',
  }),
  signature: {
    multipleParams: false,
    params: [
      {
        name: 'mode',
        type: 'string',
        values: ['any', 'coordinator', 'remote'],
        valueDescriptions: [
          i18n.translate('monaco.esql.definitions.ccqAnyDoc', {
            defaultMessage: 'Enrich takes place on any cluster',
          }),
          i18n.translate('monaco.esql.definitions.ccqCoordinatorDoc', {
            defaultMessage: 'Enrich takes place on the coordinating cluster receiving an ES|QL',
          }),
          i18n.translate('monaco.esql.definitions.ccqRemoteDoc', {
            defaultMessage: 'Enrich takes place on the cluster hosting the target index.',
          }),
        ],
      },
    ],
  },
};
