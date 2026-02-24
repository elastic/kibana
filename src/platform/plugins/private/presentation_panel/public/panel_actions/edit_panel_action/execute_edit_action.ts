/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { type ActionExecutionMeta, triggers } from '@kbn/ui-actions-plugin/public';
import { ACTION_EDIT_PANEL } from './constants';
import { uiActions } from '../../kibana_services';

export async function executeEditPanelAction(api: unknown) {
  try {
    const action = await uiActions.getAction(ACTION_EDIT_PANEL);
    action.execute({
      embeddable: api,
      trigger: triggers[ON_OPEN_PANEL_MENU],
    } as EmbeddableApiContext & ActionExecutionMeta);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Unable to execute edit action, Error: ', error.message);
  }
}
