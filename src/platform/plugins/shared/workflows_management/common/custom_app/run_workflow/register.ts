/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ActionHandler,
  type ActionUiProvider,
  registerAction,
} from '@kbn/custom-app-registry';
import { runWorkflowAction, type RunWorkflowAction } from './manifest';

/** Adds running a workflow to what an app can do. The browser also says how it is carried out, and draws the dialog that asks the person to confirm it. */
export const registerRunWorkflowAction = (
  handler?: ActionHandler<RunWorkflowAction>,
  ui?: ActionUiProvider
): void => registerAction(runWorkflowAction, handler, ui);
