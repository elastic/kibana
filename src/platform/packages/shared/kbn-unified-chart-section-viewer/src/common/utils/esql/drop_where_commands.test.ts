/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dropWhereCommands } from './drop_where_commands';

describe('dropWhereCommands', () => {
  it('returns the same string when there is no WHERE', () => {
    const query = 'TS metrics-*';
    expect(dropWhereCommands(query)).toBe(query);
  });

  it('returns undefined when the query is undefined', () => {
    expect(dropWhereCommands(undefined)).toBeUndefined();
  });

  it('returns the original query when parsing fails', () => {
    const broken = 'TS metrics-* | WHERE';
    expect(dropWhereCommands(broken)).toBe(broken);
  });

  it('removes a standalone WHERE', () => {
    expect(dropWhereCommands('TS metrics-* | WHERE attributes.service.name IS NULL')).toBe(
      'TS metrics-*'
    );
  });

  it('removes every WHERE, including ones that do not mention a selected dimension', () => {
    expect(
      dropWhereCommands(
        'TS metrics-* | WHERE attributes.service.name IS NULL AND host.name IS NOT NULL'
      )
    ).toBe('TS metrics-*');
    expect(
      dropWhereCommands('TS metrics-* | WHERE attributes.service.name IS NULL OR host.name == "h1"')
    ).toBe('TS metrics-*');
    expect(dropWhereCommands('TS metrics-* | WHERE host.name IS NOT NULL')).toBe('TS metrics-*');
  });

  it('removes multiple WHERE commands and keeps EVAL and RENAME', () => {
    expect(
      dropWhereCommands(
        'TS metrics-* | EVAL svc = `attributes.service.name` | WHERE svc IS NULL | WHERE host.name IS NOT NULL'
      )
    ).toBe('TS metrics-* | EVAL svc = `attributes.service.name`');
    expect(
      dropWhereCommands(
        'TS metrics-* | RENAME `attributes.service.name` AS svc | WHERE svc IS NULL'
      )
    ).toBe('TS metrics-* | RENAME `attributes.service.name` AS svc');
  });

  it('drops WHERE that uses KQL rather than a column node', () => {
    expect(
      dropWhereCommands('TS metrics-* | WHERE KQL("attributes.service.name : checkout")')
    ).toBe('TS metrics-*');
  });
});
