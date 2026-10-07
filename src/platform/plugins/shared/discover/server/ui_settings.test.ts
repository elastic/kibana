/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { docLinksServiceMock } from '@kbn/core/server/mocks';
import { DEFAULT_ESQL_QUERY_SETTING } from '@kbn/discover-utils';
import type { Type } from '@kbn/config-schema';
import { getUiSettings } from './ui_settings';

describe('getUiSettings', () => {
  const getDefaultEsqlQuerySchema = (): Type<string> => {
    const docLinks = docLinksServiceMock.createSetupContract();
    const settings = getUiSettings(docLinks, true);
    return settings[DEFAULT_ESQL_QUERY_SETTING].schema as Type<string>;
  };

  describe(`${DEFAULT_ESQL_QUERY_SETTING} validation`, () => {
    it('accepts an empty value', () => {
      const schema = getDefaultEsqlQuerySchema();
      expect(schema.validate('')).toBe('');
    });

    it('accepts a whitespace-only value without attempting to parse it', () => {
      const schema = getDefaultEsqlQuerySchema();
      expect(schema.validate('   ')).toBe('   ');
    });

    it('accepts a syntactically valid ES|QL query', () => {
      const schema = getDefaultEsqlQuerySchema();
      const query = 'FROM logs-* | WHERE @timestamp >= NOW() - 1 hour | LIMIT 100';
      expect(schema.validate(query)).toBe(query);
    });

    it('accepts a valid query surrounded by whitespace', () => {
      const schema = getDefaultEsqlQuerySchema();
      const query = '  FROM logs-*  ';
      expect(schema.validate(query)).toBe(query);
    });

    it('rejects a syntactically invalid ES|QL query', () => {
      const schema = getDefaultEsqlQuerySchema();
      expect(() => schema.validate('FRM logs-*')).toThrow(/Invalid ES\|QL query/);
    });
  });
});
