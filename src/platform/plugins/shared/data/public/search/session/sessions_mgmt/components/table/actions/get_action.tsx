/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart } from '@kbn/core/public';
import { IClickActionDescriptor } from './types';
import { SearchSessionsMgmtAPI } from '../../../lib/api';
import { UISession } from '../../../types';
import { createDeleteActionDescriptor } from './delete_button';
import { createExtendActionDescriptor } from './extend_button';
import { createInspectActionDescriptor } from './inspect_button';
import { Action } from './types';
import { createRenameActionDescriptor } from './rename_button';

export const getAction = (
  api: SearchSessionsMgmtAPI,
  actionType: Action,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor | null => {
  switch (actionType) {
    case 'inspect':
      return createInspectActionDescriptor(api, uiSession, core);
    case 'delete':
      return createDeleteActionDescriptor(api, uiSession, core);
    case 'extend':
      return createExtendActionDescriptor(api, uiSession, core);
    case 'rename':
      return createRenameActionDescriptor(api, uiSession, core);
    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown action: ${actionType}`);
  }

  // Unknown action: do not show

  return null;
};
