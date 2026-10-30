/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AccessPolicy, AclState, Principal } from '../types';

/**
 * Same as the connector policy: public by default, private or run-only on request, `use` grants.
 */
export const FIXTURE_POLICY: AccessPolicy = {
  generalAccess: { default: 'edit', allowed: ['none', 'use', 'edit'] },
  entryLevels: ['use'],
  operations: {
    view: { level: 'view', privileges: {} },
    use: { level: 'use', privileges: {} },
    edit: { level: 'edit', privileges: {} },
    delete: { level: 'edit', privileges: {} },
  },
};

export const FIXTURE_PROBES = {
  owner: { type: 'user', id: 'u_owner' },
  grantee: { type: 'user', id: 'u_grantee' },
  stranger: { type: 'user', id: 'u_stranger' },
  /** A service account whose ID has the same text as the owner's profile UID. */
  ownerIdServiceAccount: { type: 'service_account', id: 'u_owner' },
  anonymous: undefined,
} satisfies Record<string, Principal | undefined>;

export type FixtureProbe = keyof typeof FIXTURE_PROBES;

export interface AclShapeFixture {
  name: string;
  /** Raw document source, without the type attributes. */
  source: Record<string, unknown>;
  /** Whether Elasticsearch accepts the document with the platform `acl` mapping. */
  indexable: boolean;
  state: AclState;
  /** Probes that can view and use the object under `FIXTURE_POLICY`, without recovery. */
  access: FixtureProbe[];
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
const EVERYONE: FixtureProbe[] = [
  'owner',
  'grantee',
  'stranger',
  'ownerIdServiceAccount',
  'anonymous',
];

/**
 * Stored shapes and the access they grant. Expectations are written by hand: they define the
 * contract that the evaluator and the read filter must both meet.
 */
export const ACL_SHAPE_FIXTURES: AclShapeFixture[] = [
  { name: 'no acl', source: {}, indexable: true, state: 'absent', access: EVERYONE },
  { name: 'empty acl', source: { acl: {} }, indexable: true, state: 'absent', access: EVERYONE },
  { name: 'null acl', source: { acl: null }, indexable: true, state: 'absent', access: EVERYONE },
  {
    name: 'only an empty entry',
    source: { acl: { entries: [{}] } },
    indexable: true,
    state: 'absent',
    access: EVERYONE,
  },
  {
    name: 'only null leaves',
    source: { acl: { version: null, owner: { id: null }, entries: [] } },
    indexable: true,
    state: 'absent',
    access: EVERYONE,
  },
  {
    name: 'private',
    source: { acl: { ...PRIVATE, entries: [] } },
    indexable: true,
    state: 'valid',
    access: ['owner'],
  },
  {
    name: 'private with a use grant',
    source: { acl: { ...PRIVATE, entries: [GRANTEE_USE] } },
    indexable: true,
    state: 'valid',
    access: ['owner', 'grantee'],
  },
  {
    name: 'general access use',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'use' } },
    indexable: true,
    state: 'valid',
    access: EVERYONE,
  },
  {
    name: 'general access edit with entries',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'edit', entries: [GRANTEE_USE] } },
    indexable: true,
    state: 'valid',
    access: EVERYONE,
  },
  {
    name: 'no general access and no owner',
    source: { acl: { ...VERSION } },
    indexable: true,
    state: 'valid',
    access: [],
  },
  {
    name: 'several general access values use the lowest',
    source: { acl: { ...VERSION, ...OWNER, general_access: ['edit', 'none'] } },
    indexable: true,
    state: 'valid',
    access: ['owner'],
  },
  {
    name: 'unknown general access means none',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'everyone' } },
    indexable: true,
    state: 'valid',
    access: ['owner'],
  },
  {
    name: 'general access manage is not allowed',
    source: { acl: { ...VERSION, ...OWNER, general_access: 'manage' } },
    indexable: true,
    state: 'valid',
    access: ['owner'],
  },
  {
    name: 'unknown values are ignored when an allowed one exists',
    source: { acl: { ...VERSION, ...OWNER, general_access: ['use', 'everyone'] } },
    indexable: true,
    state: 'valid',
    access: EVERYONE,
  },
  {
    name: 'unsupported version',
    source: { acl: { ...PRIVATE, version: 2, general_access: 'edit' } },
    indexable: true,
    state: 'invalid',
    access: [],
  },
  {
    name: 'missing version',
    source: { acl: { ...OWNER, general_access: 'edit' } },
    indexable: true,
    state: 'invalid',
    access: [],
  },
  {
    name: 'mixed versions',
    source: { acl: { ...PRIVATE, version: [1, 2], general_access: 'edit' } },
    indexable: true,
    state: 'invalid',
    access: [],
  },
  {
    name: 'string version is rejected by the mapping',
    source: { acl: { ...PRIVATE, version: '1' } },
    indexable: false,
    state: 'invalid',
    access: [],
  },
  {
    name: 'owner with two known kinds owns nothing',
    source: { acl: { ...PRIVATE, owner: { type: ['user', 'service_account'], id: 'u_owner' } } },
    indexable: true,
    state: 'valid',
    access: [],
  },
  {
    name: 'unknown owner kinds are ignored',
    source: { acl: { ...PRIVATE, owner: { type: ['user', 'group'], id: 'u_owner' } } },
    indexable: true,
    state: 'valid',
    access: ['owner'],
  },
  {
    name: 'owner with several IDs matches each of them',
    source: { acl: { ...PRIVATE, owner: { type: 'user', id: ['u_owner', 'u_grantee'] } } },
    indexable: true,
    state: 'valid',
    access: ['owner', 'grantee'],
  },
  {
    name: 'entry level the type does not allow grants nothing',
    source: { acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, access: 'edit' }] } },
    indexable: true,
    state: 'valid',
    access: ['owner'],
  },
  {
    name: 'entry with several levels uses the lowest allowed',
    source: { acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, access: ['edit', 'use'] }] } },
    indexable: true,
    state: 'valid',
    access: ['owner', 'grantee'],
  },
  {
    name: 'entry with several IDs grants each of them',
    source: {
      acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, id: ['u_grantee', 'u_stranger'] }] },
    },
    indexable: true,
    state: 'valid',
    access: ['owner', 'grantee', 'stranger'],
  },
  {
    name: 'entry with two known kinds grants nothing',
    source: {
      acl: { ...PRIVATE, entries: [{ ...GRANTEE_USE, type: ['user', 'service_account'] }] },
    },
    indexable: true,
    state: 'valid',
    access: ['owner'],
  },
  {
    name: 'leaves of different entries do not combine',
    source: {
      acl: {
        ...PRIVATE,
        entries: [
          { ...GRANTEE_USE, access: 'edit' },
          { type: 'service_account', id: 'kibana/other', access: 'use' },
        ],
      },
    },
    indexable: true,
    state: 'valid',
    access: ['owner'],
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
    access: ['grantee', 'ownerIdServiceAccount'],
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
    access: ['owner'],
  },
  {
    name: 'dotted key inside acl',
    source: {
      acl: { ...VERSION, general_access: 'none', 'owner.id': 'u_owner', owner: { type: 'user' } },
    },
    indexable: true,
    state: 'valid',
    access: ['owner'],
  },
  {
    name: 'dotted entry key forms its own entry',
    source: {
      acl: { ...PRIVATE, entries: [] },
      'acl.entries': [GRANTEE_USE],
    },
    indexable: true,
    state: 'valid',
    access: ['owner', 'grantee'],
  },
  {
    name: 'dotted root value merges with the nested value',
    source: { acl: { ...PRIVATE }, 'acl.general_access': 'edit' },
    indexable: true,
    state: 'valid',
    access: ['owner'],
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
    access: ['owner', 'grantee'],
  },
  {
    name: 'numeric and boolean keyword leaves never grant',
    source: { acl: { ...VERSION, owner: { type: 'user', id: 1 }, general_access: true } },
    indexable: true,
    state: 'valid',
    access: [],
  },
];
