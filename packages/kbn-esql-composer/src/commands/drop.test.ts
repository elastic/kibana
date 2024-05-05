/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { drop } from './drop';
import { from } from './from';

describe('drop', () => {
  const source = from('logs-*');
  it('handles single strings', () => {
    expect(source.pipe(drop('log.level', 'service.name')).asString()).toEqual(
      'FROM `logs-*`\n\t| DROP `log.level`, `service.name`'
    );
  });

  it('handles arrays of strings', () => {
    expect(source.pipe(drop(['log.level', 'service.name'])).asString()).toEqual(
      'FROM `logs-*`\n\t| DROP `log.level`, `service.name`'
    );
  });
});
