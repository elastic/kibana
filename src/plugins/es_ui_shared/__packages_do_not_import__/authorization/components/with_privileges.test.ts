/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertPrivilegesToArray } from './with_privileges';

describe('convertPrivilegesToArray', () => {
  test('it knows how to corretly extract section and privilege', () => {
    expect(convertPrivilegesToArray('index.index_name')).toEqual([['index', 'index_name']]);
    expect(convertPrivilegesToArray('index.index_name.with-many.dots')).toEqual([
      ['index', 'index_name.with-many.dots'],
    ]);
  });

  test('it throws when a privilege cannot be split by a dot', () => {
    expect(() => {
      convertPrivilegesToArray('bad_privilege_string');
    }).toThrow('Required privilege must have the format "section.privilege"');
  });
});
