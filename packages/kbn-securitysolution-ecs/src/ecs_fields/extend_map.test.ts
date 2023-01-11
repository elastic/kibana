/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extendMap } from './extend_map';

describe('ecs_fields test', () => {
  describe('extendMap', () => {
    test('it should extend a record', () => {
      const osFieldsMap: Readonly<Record<string, string>> = {
        'os.platform': 'os.platform',
        'os.full': 'os.full',
        'os.family': 'os.family',
        'os.version': 'os.version',
        'os.kernel': 'os.kernel',
      };
      const expected: Record<string, string> = {
        'host.os.family': 'host.os.family',
        'host.os.full': 'host.os.full',
        'host.os.kernel': 'host.os.kernel',
        'host.os.platform': 'host.os.platform',
        'host.os.version': 'host.os.version',
      };
      expect(extendMap('host', osFieldsMap)).toEqual(expected);
    });

    test('it should extend a sample hosts record', () => {
      const hostMap: Record<string, string> = {
        'host.id': 'host.id',
        'host.ip': 'host.ip',
        'host.name': 'host.name',
      };
      const osFieldsMap: Readonly<Record<string, string>> = {
        'os.platform': 'os.platform',
        'os.full': 'os.full',
        'os.family': 'os.family',
        'os.version': 'os.version',
        'os.kernel': 'os.kernel',
      };
      const expected: Record<string, string> = {
        'host.id': 'host.id',
        'host.ip': 'host.ip',
        'host.name': 'host.name',
        'host.os.family': 'host.os.family',
        'host.os.full': 'host.os.full',
        'host.os.kernel': 'host.os.kernel',
        'host.os.platform': 'host.os.platform',
        'host.os.version': 'host.os.version',
      };
      const output = { ...hostMap, ...extendMap('host', osFieldsMap) };
      expect(output).toEqual(expected);
    });
  });
});
