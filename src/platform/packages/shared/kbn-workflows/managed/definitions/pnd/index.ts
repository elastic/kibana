/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
} from './rule_workflows';
import { PND_WATCH_DARK_WORKFLOW_ID } from './watch_dark';
import { PND_WATCH_DEEP_WORKFLOW_ID } from './watch_deep';
import { PND_WATCH_DETECTION_WORKFLOW_ID } from './watch_detection';
import { PND_WATCH_FLOOR_WORKFLOW_ID } from './watch_floor';
import { PND_WATCH_OFFICER_WORKFLOW_ID } from './watch_officer';

export {
  PND_RULE_CREATION_WORKFLOW,
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_PROPOSAL_WORKFLOW,
  PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW,
  PND_RULE_TUNING_WORKFLOW_ID,
} from './rule_workflows';
export { PND_WATCH_DARK_WORKFLOW, PND_WATCH_DARK_WORKFLOW_ID } from './watch_dark';
export { PND_WATCH_DEEP_WORKFLOW, PND_WATCH_DEEP_WORKFLOW_ID } from './watch_deep';
export { PND_WATCH_DETECTION_WORKFLOW, PND_WATCH_DETECTION_WORKFLOW_ID } from './watch_detection';
export { PND_WATCH_FLOOR_WORKFLOW, PND_WATCH_FLOOR_WORKFLOW_ID } from './watch_floor';
export { PND_WATCH_OFFICER_WORKFLOW, PND_WATCH_OFFICER_WORKFLOW_ID } from './watch_officer';

export const PND_MANAGED_WATCH_WORKFLOW_IDS = [
  PND_WATCH_FLOOR_WORKFLOW_ID,
  PND_WATCH_OFFICER_WORKFLOW_ID,
  PND_WATCH_DARK_WORKFLOW_ID,
  PND_WATCH_DEEP_WORKFLOW_ID,
  PND_WATCH_DETECTION_WORKFLOW_ID,
] as const;

export const PND_RULE_WORKFLOW_IDS = [
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
  PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID,
  PND_RULE_CREATION_WORKFLOW_ID,
] as const;
