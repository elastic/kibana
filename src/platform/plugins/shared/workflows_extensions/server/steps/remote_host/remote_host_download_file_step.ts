/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { downloadFile } from './execute_in_connector';
import { remoteHostDownloadFileStepCommonDefinition } from '../../../common/steps/remote_host';
import { createServerStepDefinition } from '../../step_registry/types';

interface Deps {
  getActionsStart: () => ActionsPluginStartContract | undefined;
}

export const createRemoteHostDownloadFileStepDefinition = ({ getActionsStart }: Deps) =>
  createServerStepDefinition({
    ...remoteHostDownloadFileStepCommonDefinition,
    handler: async (context) => {
      const { remotePath } = context.input;
      const connectorId = context.config['connector-id'];

      const content = await downloadFile(
        {
          connectorId,
          request: context.contextManager.getFakeRequest(),
          actionsStart: getActionsStart(),
          abortSignal: context.abortSignal,
        },
        remotePath
      );

      return { output: { content } };
    },
  });
