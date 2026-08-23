/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as authTypeSpecs from './all_auth_types';
import * as connectorsSpecs from './all_specs';
import type { AuthTypeDef, ConnectorSpec, NormalizedAuthType } from './connector_spec';
import { ConnectorIconsMap } from './connector_icons_map';
import { getSchemaForAuthType } from './lib';
import { buildEventId, MAX_CONNECTOR_TYPE_ID_LENGTH } from './event_type_id';
import { SPECS_ALLOWED_EVENTS } from './specs_allowed_events';

const CONNECTOR_ID_PATTERN = /^\.[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const allSpecs = Object.entries(connectorsSpecs) as Array<[string, ConnectorSpec]>;
const registeredAuthTypes = Object.values(authTypeSpecs) as NormalizedAuthType[];

const getAuthTypeId = (authType: string | AuthTypeDef): string =>
  typeof authType === 'string' ? authType : authType.type;

describe('connector spec contracts', () => {
  it('uses unique connector IDs', () => {
    const connectorIds = allSpecs.map(([, spec]) => spec.metadata.id);
    const duplicateConnectorIds = connectorIds.filter(
      (connectorId, index) => connectorIds.indexOf(connectorId) !== index
    );

    expect(duplicateConnectorIds).toEqual([]);
  });

  it.each(allSpecs)('%s has valid metadata', (_exportName, spec) => {
    const { metadata } = spec;

    expect(metadata.id).toMatch(CONNECTOR_ID_PATTERN);
    expect(metadata.id.length).toBeLessThanOrEqual(MAX_CONNECTOR_TYPE_ID_LENGTH);
    expect(metadata.displayName.trim()).not.toHaveLength(0);
    if (metadata.featureUsageName !== undefined) {
      expect(metadata.featureUsageName.trim()).not.toHaveLength(0);
    }
    expect(metadata.description.trim()).not.toHaveLength(0);
    // supportedFeatureIds may be [] for support-only connectors (not yet feature-enabled).
    // Non-empty entries must be valid feature ID strings.
    if (metadata.supportedFeatureIds.length > 0) {
      expect(metadata.supportedFeatureIds.every((id) => typeof id === 'string')).toBe(true);
    }
  });

  it.each(allSpecs)('%s has valid authentication configuration', (_exportName, spec) => {
    const authTypes = spec.auth?.types ?? [];
    const authTypeIds = authTypes.map(getAuthTypeId);
    const violations: string[] = [];

    if (new Set(authTypeIds).size !== authTypeIds.length) {
      violations.push('auth type IDs must be unique');
    }

    for (const authType of authTypes) {
      getSchemaForAuthType(authType);

      if (typeof authType === 'string') {
        continue;
      }

      const registeredAuthType = registeredAuthTypes.find(({ id }) => id === authType.type);
      for (const defaultField of Object.keys(authType.defaults)) {
        const inSchema = registeredAuthType && defaultField in registeredAuthType.schema.shape;
        if (!inSchema) {
          violations.push(`${authType.type}.${defaultField} is not defined by the auth type`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it.each(allSpecs)('%s has valid action authentication constraints', (_exportName, spec) => {
    const authTypeIds = new Set((spec.auth?.types ?? []).map(getAuthTypeId));
    const violations: string[] = [];

    for (const [actionName, action] of Object.entries(spec.actions)) {
      if (action.supportedAuthTypes === undefined) {
        continue;
      }

      if (action.supportedAuthTypes.length === 0) {
        violations.push(`${actionName} must support at least one auth type`);
      }
      if (new Set(action.supportedAuthTypes).size !== action.supportedAuthTypes.length) {
        violations.push(`${actionName} supported auth types must be unique`);
      }
      for (const authTypeId of action.supportedAuthTypes) {
        if (!authTypeIds.has(authTypeId)) {
          violations.push(`${actionName} references unknown auth type ${authTypeId}`);
        }
      }
      for (const [authTypeId, message] of Object.entries(
        action.unsupportedAuthTypeMessages ?? {}
      )) {
        if (!authTypeIds.has(authTypeId)) {
          violations.push(`${actionName} has a message for unknown auth type ${authTypeId}`);
        }
        if (message.trim().length === 0) {
          violations.push(`${actionName} has an empty message for auth type ${authTypeId}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps exported connector IDs and icon IDs in sync', () => {
    const connectorIdsRequiringMappedIcons = allSpecs
      .map(([, spec]) => spec)
      .filter(({ metadata }) => metadata.icon === undefined)
      .map(({ metadata }) => metadata.id)
      .sort();
    const mappedIconIds = [...ConnectorIconsMap.keys()].sort();

    expect(mappedIconIds).toEqual(connectorIdsRequiringMappedIcons);
  });

  it.each(allSpecs)('%s does not declare events unless allowlisted', (_exportName, spec) => {
    if (spec.events === undefined) {
      return;
    }
    expect(SPECS_ALLOWED_EVENTS.has(spec.metadata.id)).toBe(true);
  });

  it.each(allSpecs)('%s eventIds match metadata.id when events present', (_exportName, spec) => {
    if (spec.events === undefined) {
      return;
    }
    for (const [eventKey, def] of Object.entries(spec.events.definitions)) {
      expect(def.eventId).toBe(buildEventId(spec.metadata.id, eventKey));
    }
  });

  it('uses unique eventIds across connector specs', () => {
    const eventIdOwners = new Map<string, string>();
    const duplicates: string[] = [];

    for (const [exportName, spec] of allSpecs) {
      if (spec.events !== undefined) {
        for (const [eventKey, def] of Object.entries(spec.events.definitions)) {
          const owner = `${exportName} (${spec.metadata.id}.${eventKey})`;
          const existing = eventIdOwners.get(def.eventId);
          if (existing !== undefined) {
            duplicates.push(`${def.eventId}: ${existing} and ${owner}`);
          } else {
            eventIdOwners.set(def.eventId, owner);
          }
        }
      }
    }

    expect(duplicates).toEqual([]);
  });
});
