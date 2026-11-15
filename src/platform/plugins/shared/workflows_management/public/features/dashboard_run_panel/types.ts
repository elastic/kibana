/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasEditCapabilities, PublishesWritableTitle } from '@kbn/presentation-publishing';
import type { WorkflowRunEmbeddableState } from '../../../server/dashboard_run_panel/schema';

export type WorkflowRunPanelConfig = Pick<
  WorkflowRunEmbeddableState,
  'workflow_id' | 'button_label' | 'input_mappings'
>;

export type WorkflowRunEmbeddableApi = DefaultEmbeddableApi<WorkflowRunEmbeddableState> &
  PublishesWritableTitle &
  HasEditCapabilities;
