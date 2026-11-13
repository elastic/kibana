/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ARGUMENT_ROLES } from '../signatures/argument_roles';
import type { ArgumentRole, EntityType } from '../signatures/types';
import { ENTITY_FACTS, ENTITY_TYPES } from './entity_facts';

/** The kinds of entity a role names, itself or in what it holds. */
const entityTypesOf = (role: ArgumentRole): EntityType[] => {
  switch (role.kind) {
    case 'entity':
      return [role.entityType];
    case 'map':
      return Object.values(role.parameters).flatMap((parameter) =>
        parameter.entityType ? [parameter.entityType] : []
      );
    case 'dependent_value':
      return [
        ...(role.definedBy ? [role.definedBy] : []),
        ...Object.values(role.roles ?? {}).flatMap(entityTypesOf),
      ];
    default:
      return [];
  }
};

describe('the entity vocabulary', () => {
  const used = new Set(Object.values(ARGUMENT_ROLES).flatMap(entityTypesOf));

  it('has no kind of entity that no argument names', () => {
    expect(ENTITY_TYPES.filter((type) => !used.has(type))).toEqual([]);
  });

  it('gives an entity that comes from a parent a parent that exists', () => {
    const wrong = ENTITY_TYPES.filter((type) => {
      const { origin, parent } = ENTITY_FACTS[type];

      return origin === 'parent' ? !parent || !(parent in ENTITY_FACTS) : parent !== undefined;
    });

    expect(wrong).toEqual([]);
  });

  it('makes an argument that names such an entity depend on an argument that names its parent', () => {
    const wrong = Object.entries(ARGUMENT_ROLES).flatMap(([id, role]) => {
      if (role.kind !== 'entity') {
        return [];
      }

      const { origin, parent } = ENTITY_FACTS[role.entityType];
      const dependsOn = role.dependsOn ? ARGUMENT_ROLES[role.dependsOn] : undefined;
      const namesParent = dependsOn?.kind === 'entity' && dependsOn.entityType === parent;

      // It depends on its parent exactly when it has one.
      return (origin === 'parent') === namesParent ? [] : [id];
    });

    expect(wrong).toEqual([]);
  });
});
