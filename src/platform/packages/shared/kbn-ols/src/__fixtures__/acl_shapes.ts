/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AclState } from '../acl';
import type { EntryLevel } from '../levels';
import type { AccessPolicy } from '../policy';
import type { Principal } from '../principals';

/**
 * Policy most fixtures are evaluated under: public by default, restrictable to `none` or `use`,
 * and entries that grant `use`.
 */
export const FIXTURE_POLICY: AccessPolicy = {
  generalAccessLevels: ['none', 'use', 'edit'],
  defaultGeneralAccessLevel: 'edit',
  entryLevels: ['use'],
  operations: {
    view: { level: 'view', privileges: {} },
    use: { level: 'use', privileges: {} },
    edit: { level: 'edit', privileges: {} },
    delete: { level: 'edit', privileges: {} },
  },
};

/**
 * Policy where `view`, `use`, and `edit` all differ: private by default, general access that can
 * be `view` but not `use`, and entries that grant `view`, `use`, or `edit`.
 */
export const FIXTURE_POLICY_ALL_LEVELS: AccessPolicy = {
  generalAccessLevels: ['none', 'view', 'edit'],
  defaultGeneralAccessLevel: 'none',
  entryLevels: ['view', 'use', 'edit'],
  operations: FIXTURE_POLICY.operations,
};

/**
 * Principals whose access each fixture states. `anonymous` stands for a request with no principal.
 */
export const FIXTURE_PROBES = {
  owner: { type: 'user', id: 'u_owner' },
  grantee: { type: 'user', id: 'u_grantee' },
  stranger: { type: 'user', id: 'u_stranger' },
  /** A service account whose ID has the same text as the owner's profile UID. */
  ownerIdServiceAccount: { type: 'service_account', id: 'u_owner' },
  /** A user whose ID is the text form of a number, to match IDs stored as numbers. */
  numericIdUser: { type: 'user', id: '1' },
  anonymous: undefined,
} satisfies Record<string, Principal | undefined>;

/**
 * Name of one of the {@link FIXTURE_PROBES}.
 */
export type FixtureProbe = keyof typeof FIXTURE_PROBES;

/**
 * Stored ACL shape with the access it must grant.
 */
export interface AclShapeFixture {
  /** Unique, human-readable name of the shape. */
  name: string;
  /** Raw document source, without the type attributes. */
  source: Record<string, unknown>;
  /** Whether Elasticsearch accepts the document with the platform `acl` mapping. */
  indexable: boolean;
  /** The policy the expectations hold under. {@link FIXTURE_POLICY} when it is not set. */
  policy?: AccessPolicy;
  /** The state the stored ACL is in. */
  state: AclState;
  /**
   * The highest level each probe can act at without recovery. Levels include every level below
   * them, and the owner of a valid ACL acts at `manage`. A probe that can't even view the object
   * is left out.
   */
  access: Partial<Record<FixtureProbe, EntryLevel>>;
}

const VERSION = { version: 1 };
const OWNER = { owner: { type: 'user', id: 'u_owner' } };
const PRIVATE = { ...VERSION, ...OWNER, general_access: 'none' };
const GRANTEE_USE = {
  type: 'user',
  id: 'u_grantee',
  access: 'use',
  added_at: '2026-10-21T00:00:00Z',
};

/**
 * Every probe at the same level.
 */
const allProbesAt = (level: EntryLevel): Record<FixtureProbe, EntryLevel> => ({
  owner: level,
  grantee: level,
  stranger: level,
  ownerIdServiceAccount: level,
  numericIdUser: level,
  anonymous: level,
});

/**
 * Stored ACL shapes and the access each one grants. Expectations are written by hand: they are the
 * contract that both the evaluation of a single object and the filtering of a search must meet.
 */
export const ACL_SHAPE_FIXTURES: AclShapeFixture[] = [
  {
    name: 'no acl',
    source: {},
    indexable: true,
    state: 'absent',
    access: allProbesAt('edit'),
  },
  {
    name: 'empty acl',
    source: { acl: {} },
    indexable: true,
    state: 'absent',
    access: allProbesAt('edit'),
  },
  {
    name: 'null acl',
    source: { acl: null },
    indexable: true,
    state: 'absent',
    access: allProbesAt('edit'),
  },
  {
    name: 'only an empty entry',
    source: { acl: { entries: [{}] } },
    indexable: true,
    state: 'absent',
    access: allProbesAt('edit'),
  },
  {
    name: 'only null leaves',
    source: { acl: { version: null, owner: { id: null }, entries: [] } },
    indexable: true,
    state: 'absent',
    access: allProbesAt('edit'),
  },
  {
    name: 'private',
    source: { acl: { ...PRIVATE, entries: [] } },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'private with a use grant',
    source: { acl: { ...PRIVATE, entries: [GRANTEE_USE] } },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage', grantee: 'use' },
  },
  {
    name: 'general access use',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'use' } },
    indexable: true,
    state: 'valid',
    access: { ...allProbesAt('use'), owner: 'manage' },
  },
  {
    name: 'general access edit with entries',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'edit', entries: [GRANTEE_USE] } },
    indexable: true,
    state: 'valid',
    access: { ...allProbesAt('edit'), owner: 'manage' },
  },
  {
    name: 'no general access and no owner is damaged',
    source: { acl: { ...VERSION } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'no owner is damaged',
    source: { acl: { ...VERSION, general_access: 'edit' } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'owner without an ID is damaged',
    source: { acl: { ...VERSION, owner: { type: 'user' }, general_access: 'edit' } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'several general access values use the lowest',
    source: { acl: { ...VERSION, ...OWNER, general_access: ['edit', 'none', 'use'] } },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'unknown general access is damaged',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'everyone' } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'general access manage is damaged',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'manage' } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'general access the type does not allow means none',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'view' } },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'general access the type does not allow is ignored next to an allowed one',
    source: { acl: { ...VERSION, ...OWNER, general_access: ['view', 'edit'] } },
    indexable: true,
    state: 'valid',
    access: { ...allProbesAt('edit'), owner: 'manage' },
  },
  {
    name: 'unknown values are ignored when an allowed one exists',
    source: { acl: { ...VERSION, ...OWNER, general_access: ['use', 'everyone'] } },
    indexable: true,
    state: 'valid',
    access: { ...allProbesAt('use'), owner: 'manage' },
  },
  {
    name: 'unsupported version',
    source: { acl: { ...PRIVATE, version: 2, general_access: 'edit' } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'missing version',
    source: { acl: { ...OWNER, general_access: 'edit' } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'mixed versions',
    source: { acl: { ...PRIVATE, version: [1, 2], general_access: 'edit' } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'string version is rejected by the mapping',
    source: { acl: { ...PRIVATE, version: '1' } },
    indexable: false,
    state: 'invalid',
    access: {},
  },
  {
    name: 'owner with two known kinds is damaged',
    source: { acl: { ...PRIVATE, owner: { type: ['user', 'service_account'], id: 'u_owner' } } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'owner with two known kinds is damaged even when general access and an entry grant',
    source: {
      acl: {
        ...VERSION,
        owner: { type: ['user', 'service_account'], id: 'u_owner' },
        general_access: 'edit',
        entries: [GRANTEE_USE],
      },
    },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'unknown owner kinds are ignored',
    source: { acl: { ...PRIVATE, owner: { type: ['user', 'agent'], id: 'u_owner' } } },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'owner with several IDs matches each of them',
    source: { acl: { ...PRIVATE, owner: { type: 'user', id: ['u_owner', 'u_grantee'] } } },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage', grantee: 'manage' },
  },
  {
    name: 'entry with a level the type does not allow grants nothing',
    source: { acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, access: 'edit' }] } },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'entry with several levels uses the lowest allowed',
    source: { acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, access: ['edit', 'use'] }] } },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage', grantee: 'use' },
  },
  {
    name: 'entry with several IDs grants each of them',
    source: {
      acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, id: ['u_grantee', 'u_stranger'] }] },
    },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage', grantee: 'use', stranger: 'use' },
  },
  {
    name: 'entry with two known kinds grants nothing',
    source: {
      acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, type: ['user', 'service_account'] }] },
    },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'leaves of different entries do not combine',
    source: {
      acl: {
        ...PRIVATE,
        entries: [
          { ...GRANTEE_USE, access: 'edit' },
          { type: 'service_account', id: 'u_owner', access: 'use' },
        ],
      },
    },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage', ownerIdServiceAccount: 'use' },
  },
  {
    name: 'service account entry does not match a user with the same ID text',
    source: {
      acl: {
        ...VERSION,
        owner: { type: 'user', id: 'u_grantee' },
        general_access: 'none',
        entries: [{ ...GRANTEE_USE, type: 'service_account', id: 'u_owner' }],
      },
    },
    indexable: true,
    state: 'valid',
    access: { grantee: 'manage', ownerIdServiceAccount: 'use' },
  },
  {
    name: 'dotted root keys are indexed',
    source: {
      acl: { ...VERSION, general_access: 'none' },
      'acl.owner.type': 'user',
      'acl.owner.id': 'u_owner',
    },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'dotted key inside acl',
    source: {
      acl: { ...VERSION, general_access: 'none', 'owner.id': 'u_owner', owner: { type: 'user' } },
    },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'dotted entry key forms its own entry',
    source: {
      acl: { ...PRIVATE, entries: [] },
      'acl.entries': [GRANTEE_USE],
    },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage', grantee: 'use' },
  },
  {
    name: 'dotted root value merges with a lower nested value',
    source: { acl: { ...PRIVATE }, 'acl.general_access': 'edit' },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'dotted root value merges with a higher nested value',
    source: { acl: { ...PRIVATE, general_access: 'edit' }, 'acl.general_access': 'none' },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage' },
  },
  {
    name: 'array of acl objects is flattened',
    source: {
      acl: [
        { ...VERSION, ...OWNER },
        { general_access: 'none', entries: [GRANTEE_USE] },
      ],
    },
    indexable: true,
    state: 'valid',
    access: { owner: 'manage', grantee: 'use' },
  },
  {
    name: 'numeric owner ID is read as text',
    source: { acl: { ...VERSION, owner: { type: 'user', id: 1 }, general_access: 'none' } },
    indexable: true,
    state: 'valid',
    access: { numericIdUser: 'manage' },
  },
  {
    name: 'boolean general access is damaged',
    source: { acl: { ...VERSION, ...OWNER, general_access: true } },
    indexable: true,
    state: 'invalid',
    access: {},
  },
  {
    name: 'no acl under a private default',
    source: {},
    indexable: true,
    policy: FIXTURE_POLICY_ALL_LEVELS,
    state: 'absent',
    access: {},
  },
  {
    name: 'general access view with a use grant',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'view', entries: [GRANTEE_USE] } },
    indexable: true,
    policy: FIXTURE_POLICY_ALL_LEVELS,
    state: 'valid',
    access: { ...allProbesAt('view'), owner: 'manage', grantee: 'use' },
  },
  {
    name: 'duplicate entries for one principal use the highest',
    source: {
      acl: {
        ...PRIVATE,
        entries: [
          { ...GRANTEE_USE, access: 'view' },
          { ...GRANTEE_USE, access: 'edit' },
        ],
      },
    },
    indexable: true,
    policy: FIXTURE_POLICY_ALL_LEVELS,
    state: 'valid',
    access: { owner: 'manage', grantee: 'edit' },
  },
  {
    name: 'entry with several allowed levels uses the lowest',
    source: { acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, access: ['edit', 'view'] }] } },
    indexable: true,
    policy: FIXTURE_POLICY_ALL_LEVELS,
    state: 'valid',
    access: { owner: 'manage', grantee: 'view' },
  },
];
