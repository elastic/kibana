/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { IndexPrivileges } from './use_index_privileges';
import {
  FROM_INDEX_COMMAND_ID,
  getConcreteLocalFromIndices,
  getFromIndexCommandString,
  isOriginOnlyProjectRouting,
  isReservedIndexName,
} from './use_from_index_editor';

describe('getConcreteLocalFromIndices', () => {
  it('returns a single concrete index referenced by a FROM command', () => {
    expect(getConcreteLocalFromIndices('FROM my_index')).toEqual(['my_index']);
  });

  it('returns every concrete index listed in a FROM command', () => {
    expect(getConcreteLocalFromIndices('FROM index1, index2')).toEqual(['index1', 'index2']);
  });

  it('ignores the rest of the query after the source command', () => {
    expect(getConcreteLocalFromIndices('FROM my_index | WHERE value > 1 | LIMIT 10')).toEqual([
      'my_index',
    ]);
  });

  it('excludes wildcard patterns', () => {
    expect(getConcreteLocalFromIndices('FROM logs-*')).toEqual([]);
  });

  it('excludes remote-cluster references', () => {
    expect(getConcreteLocalFromIndices('FROM remote_cluster:my_index')).toEqual([]);
  });

  it('keeps only the concrete local index when mixed with wildcards and remote refs', () => {
    expect(
      getConcreteLocalFromIndices('FROM local_index, logs-*, remote_cluster:other_index')
    ).toEqual(['local_index']);
  });

  it('returns nothing for non-FROM source commands', () => {
    expect(getConcreteLocalFromIndices('TS metrics')).toEqual([]);
    expect(getConcreteLocalFromIndices('SHOW INFO')).toEqual([]);
  });

  it('returns nothing for an empty query', () => {
    expect(getConcreteLocalFromIndices('')).toEqual([]);
  });
});

describe('getFromIndexCommandString', () => {
  const readOnly: IndexPrivileges = {
    canCreateIndex: false,
    canEditIndex: false,
    canReadIndex: true,
  };
  const canEdit: IndexPrivileges = {
    canCreateIndex: false,
    canEditIndex: true,
    canReadIndex: true,
  };
  const canCreate: IndexPrivileges = {
    canCreateIndex: true,
    canEditIndex: true,
    canReadIndex: true,
  };

  it('renders an "Edit index" command for an existing index the user can edit', () => {
    const command = getFromIndexCommandString('my_index', true, canEdit);

    expect(command).toContain('Edit index');
    expect(command).toContain(`command:${FROM_INDEX_COMMAND_ID}`);
  });

  it('renders a "Create index" command for a missing index the user can create', () => {
    const command = getFromIndexCommandString('my_index', false, canCreate);

    expect(command).toContain('Create index');
    expect(command).toContain(`command:${FROM_INDEX_COMMAND_ID}`);
  });

  it('renders no command for an existing index the user can only read', () => {
    expect(getFromIndexCommandString('my_index', true, readOnly)).toBeUndefined();
  });

  it('renders no command for a missing index the user cannot create', () => {
    expect(getFromIndexCommandString('my_index', false, canEdit)).toBeUndefined();
  });

  it('renders no command for a reserved dot-prefixed index, even when it looks missing', () => {
    expect(
      getFromIndexCommandString('.internal.alerts-security.alerts-default-000001', false, canCreate)
    ).toBeUndefined();
  });

  it('renders no command for a reserved dot-prefixed index the user can edit', () => {
    expect(getFromIndexCommandString('.ds-logs-default-000001', true, canEdit)).toBeUndefined();
  });
});

describe('isReservedIndexName', () => {
  it('flags names beginning with a dot', () => {
    expect(isReservedIndexName('.internal.alerts-security.alerts-default-000001')).toBe(true);
    expect(isReservedIndexName('.ds-logs-default-000001')).toBe(true);
  });

  it('ignores surrounding quotes when detecting the dot prefix', () => {
    expect(isReservedIndexName('".ds-logs-default-000001"')).toBe(true);
    expect(isReservedIndexName('`.internal.alerts`')).toBe(true);
  });

  it('does not flag regular index names', () => {
    expect(isReservedIndexName('my_index')).toBe(false);
    expect(isReservedIndexName('logs-default')).toBe(false);
  });
});

describe('isOriginOnlyProjectRouting', () => {
  it('treats unset routing as origin-only', () => {
    expect(isOriginOnlyProjectRouting(undefined)).toBe(true);
  });

  it('treats the explicit origin expression as origin-only', () => {
    expect(isOriginOnlyProjectRouting(PROJECT_ROUTING.ORIGIN)).toBe(true);
  });

  it('treats all-projects routing as not origin-only', () => {
    expect(isOriginOnlyProjectRouting(PROJECT_ROUTING.ALL)).toBe(false);
  });

  it('treats a named routing expression as not origin-only', () => {
    expect(isOriginOnlyProjectRouting('_alias:my-linked-project')).toBe(false);
    expect(isOriginOnlyProjectRouting('my-npre*')).toBe(false);
  });
});
