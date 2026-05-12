/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

export enum AgentConfigurationPageStep {
  ChooseService = 'choose-service-step',
  ChooseSettings = 'choose-settings-step',
  Review = 'review-step',
}

export const agentConfigurationPageStepRt = t.union([
  t.literal(AgentConfigurationPageStep.ChooseService),
  t.literal(AgentConfigurationPageStep.ChooseSettings),
  t.literal(AgentConfigurationPageStep.Review),
]);
