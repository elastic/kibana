/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import * as Actions from './actions';

type CleanableState = { sourceIndexPitId: string } | {};

export async function cleanup(client: ElasticsearchClient, state?: CleanableState) {
  if (!state) {
    return;
  }
  if ('sourceIndexPitId' in state) {
    await Actions.closePit({ client, pitId: state.sourceIndexPitId })();
  }
}
