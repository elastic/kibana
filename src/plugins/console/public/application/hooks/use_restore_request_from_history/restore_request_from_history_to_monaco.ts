/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatRequestBodyDoc } from '../../../lib/utils';
import { MonacoEditorActionsProvider } from '../../containers/editor/monaco/monaco_editor_actions_provider';
import { ESRequest } from '../../../types';

export async function restoreRequestFromHistoryToMonaco(
  provider: MonacoEditorActionsProvider,
  req: ESRequest
) {
  let s = req.method + ' ' + req.endpoint;
  if (req.data) {
    const indent = true;
    const formattedData = formatRequestBodyDoc([req.data], indent);
    s += '\n' + formattedData.data;
  }
  await provider.restoreRequestFromHistory(s);
}
