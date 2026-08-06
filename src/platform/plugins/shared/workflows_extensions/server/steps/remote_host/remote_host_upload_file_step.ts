/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { executeSubAction } from './execute_in_connector';
import { remoteHostUploadFileStepCommonDefinition } from '../../../common/steps/remote_host';
import { createServerStepDefinition } from '../../step_registry/types';

interface Deps {
  getActionsStart: () => ActionsPluginStartContract | undefined;
}

export const createRemoteHostUploadFileStepDefinition = ({ getActionsStart }: Deps) =>
  createServerStepDefinition({
    ...remoteHostUploadFileStepCommonDefinition,
    handler: async (context) => {
      const { remotePath, content } = context.input;
      const connectorId = context.config['connector-id'];

      await executeSubAction({
        connectorId,
        request: context.contextManager.getFakeRequest(),
        actionsStart: getActionsStart(),
        subAction: 'uploadFile',
        subActionParams: {
          remotePath,
          content: Buffer.from(content).toString('base64'),
          encoding: 'base64',
        },
        abortSignal: context.abortSignal,
      });

      return { output: null };
    },
  });
