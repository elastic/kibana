/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PND_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID } from './dark_continuous_threat_hunt';
import { PND_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID } from './detection_rule_creation';
import { PND_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID } from './detection_rule_tuning';
import { PND_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID } from './floor_alert_triage';
import { PND_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID } from './floor_attack_discovery';
import {
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
} from './rule_workflows';

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
export {
  PND_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW,
  PND_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
} from './dark_continuous_threat_hunt';
export {
  PND_WORKER_DETECTION_RULE_CREATION_WORKFLOW,
  PND_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID,
} from './detection_rule_creation';
export {
  PND_WORKER_DETECTION_RULE_TUNING_WORKFLOW,
  PND_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
} from './detection_rule_tuning';
export {
  PND_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW,
  PND_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
} from './floor_alert_triage';
export {
  PND_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW,
  PND_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
} from './floor_attack_discovery';

export const PND_MANAGED_WORKER_WORKFLOW_IDS = [
  PND_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  PND_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  PND_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  PND_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  PND_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID,
] as const;

export const PND_RULE_WORKFLOW_IDS = [
  PND_RULE_PREVIEW_WORKFLOW_ID,
  PND_RULE_TUNING_PROPOSAL_WORKFLOW_ID,
  PND_RULE_CREATION_WORKFLOW_ID,
  PND_RULE_TUNING_WORKFLOW_ID,
] as const;
