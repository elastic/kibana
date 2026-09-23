/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0; you may not use
 * this file except in compliance with the Elastic License 2.0.
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as ruleCreationConfig } from '../../evals_detection_watch_rule_creation/stateful/classic.stateful.config';

/**
 * Config set for the detection-watch-rule-tuning eval suite. The suite drives the managed
 * rule-tuning worker + review workflows the alertzero plugin installs at start, so every
 * flag the rule-creation set enables is required here too — including
 * `--xpack.agenticInvestigations.enabled=true`, which that set already carries (it is a
 * requiredPlugin of alertzero whose `enabled` config defaults to false; without it core
 * disables alertzero and the managed tuning workflows are never installed).
 *
 * This set therefore inherits the rule-creation serverArgs unchanged and adds nothing:
 * re-adding a flag the base set already declares would duplicate it, and the
 * classic.stateful.config.test.ts guard pins each required flag to exactly one entry.
 */
export const servers: ScoutServerConfig = {
  ...ruleCreationConfig,
};
