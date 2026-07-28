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

const CONNECTOR_ID_PATTERN = /^\.[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;
const MAX_CONNECTOR_ID_LENGTH = 64;
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
    expect(metadata.id.length).toBeLessThanOrEqual(MAX_CONNECTOR_ID_LENGTH);
    expect(metadata.displayName.trim()).not.toHaveLength(0);
    expect(metadata.description.trim()).not.toHaveLength(0);
    expect(metadata.supportedFeatureIds.length).toBeGreaterThan(0);
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
        if (!registeredAuthType || !(defaultField in registeredAuthType.schema.shape)) {
          violations.push(`${authType.type}.${defaultField} is not defined by the auth type`);
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
});
