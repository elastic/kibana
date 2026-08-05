/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSkillSpec } from '../../../connector_spec';
import { escalationPoliciesSkillFile } from './escalation_policies';
import { getIncidentsSkillFile } from './get_incidents';
import { oncallSkillFile } from './oncall';
import { usersTeamsSkillFile } from './users_teams';

export type { ConnectorSkillSpec };
export { escalationPoliciesSkillFile, getIncidentsSkillFile, oncallSkillFile, usersTeamsSkillFile };

export const skillFiles: ConnectorSkillSpec[] = [
  escalationPoliciesSkillFile,
  getIncidentsSkillFile,
  oncallSkillFile,
  usersTeamsSkillFile,
];
