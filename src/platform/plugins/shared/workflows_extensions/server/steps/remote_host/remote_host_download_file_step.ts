/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { remoteHostDownloadFileStepCommonDefinition } from '../../../common/steps/remote_host';
import { createServerStepDefinition } from '../../step_registry/types';
import { executeSubAction } from './execute_in_connector';

interface Deps {
  getActionsStart: () => ActionsPluginStartContract | undefined;
}

export const createRemoteHostDownloadFileStepDefinition = ({ getActionsStart }: Deps) =>
  createServerStepDefinition({
    ...remoteHostDownloadFileStepCommonDefinition,
    handler: async (context) => {
      const { remotePath } = context.input;
      const connectorId = context.config['connector-id'];

      const result = await executeSubAction<{ content: string; encoding: 'base64' }>({
        connectorId,
        request: context.contextManager.getFakeRequest(),
        actionsStart: getActionsStart(),
        subAction: 'downloadFile',
        subActionParams: { remotePath },
        abortSignal: context.abortSignal,
      });

      const content = Buffer.from(result.content, 'base64').toString('utf-8');
      return { output: { content } };
    },
  });
