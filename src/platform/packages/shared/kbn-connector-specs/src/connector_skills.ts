/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as connectorsSpecs from './all_specs';
import type { ConnectorSkillSpec } from './connector_spec';
import { getConnectorSpec } from './get_connector_spec';

/** Prefix of the Agent Builder built-in skill id registered for a connector skill. */
export const CONNECTOR_SKILL_ID_PREFIX = 'platform.connectors.';

export interface ConnectorTypeSkill {
  connectorTypeId: string;
  skill: ConnectorSkillSpec;
}

/** Returns the Agent Builder built-in skill id for a connector skill. */
export const getConnectorSkillRegistryId = (skill: Pick<ConnectorSkillSpec, 'id'>): string =>
  `${CONNECTOR_SKILL_ID_PREFIX}${skill.id}`;

/** Returns every connector skill, with the connector type that owns it. */
export const getAllConnectorSkills = (): ConnectorTypeSkill[] =>
  Object.values(connectorsSpecs).flatMap((spec) =>
    (spec.skillFiles ?? []).map((skill) => ({ connectorTypeId: spec.metadata.id, skill }))
  );

/** Returns the built-in skill ids for a connector type, or an empty list when it has no skills. */
export const getConnectorSkillRegistryIds = (connectorTypeId: string): string[] =>
  (getConnectorSpec(connectorTypeId)?.skillFiles ?? []).map(getConnectorSkillRegistryId);
