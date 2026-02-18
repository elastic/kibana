/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getProjectRoutingFromEsqlQuery } from './set_instructions_helpers';

describe('set instructions helpers', () => {
  describe('getProjectRoutingFromEsqlQuery', () => {
    describe('when project_routing is not set', () => {
      it('should return undefined for a simple FROM query', () => {
        const queryString = 'FROM my_index';
        const result = getProjectRoutingFromEsqlQuery(queryString);
        expect(result).toBeUndefined();
      });

      it('should return undefined for a query with other SET instructions', () => {
        const queryString = 'SET other_setting = "value"; FROM my_index';
        const result = getProjectRoutingFromEsqlQuery(queryString);
        expect(result).toBeUndefined();
      });
    });

    describe('when project_routing is set', () => {
      it('should return the correct project routing for "_alias:*"', () => {
        const queryString = 'SET project_routing = "_alias:*"; FROM my_index';
        const result = getProjectRoutingFromEsqlQuery(queryString);
        expect(result).toBe('_alias:*');
      });

      it('should return the correct project routing for "_alias:_origin"', () => {
        const queryString = 'SET project_routing = "_alias:_origin"; FROM my_index';
        const result = getProjectRoutingFromEsqlQuery(queryString);
        expect(result).toBe('_alias:_origin');
      });

      it('should work with multiple SET instructions', () => {
        const queryString =
          'SET other_setting = "value"; SET project_routing = "_alias: projectId"; FROM my_index';
        const result = getProjectRoutingFromEsqlQuery(queryString);
        expect(result).toBe('_alias: projectId');
      });
    });
  });
});
