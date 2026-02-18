/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizePath, buildTerraformApiIndex, type TerraformApi } from './load_terraform_apis';

describe('load_terraform_apis', () => {
  describe('normalizePath', () => {
    it('normalizes path parameters to {param}', () => {
      expect(normalizePath('/api/spaces/space/{id}')).toBe('/api/spaces/space/{param}');
      expect(normalizePath('/api/alerting/rule/{ruleId}')).toBe('/api/alerting/rule/{param}');
    });

    it('normalizes multiple parameters', () => {
      expect(normalizePath('/api/{spaceId}/objects/{objectId}')).toBe(
        '/api/{param}/objects/{param}'
      );
    });

    it('converts to lowercase', () => {
      expect(normalizePath('/API/Spaces/Space')).toBe('/api/spaces/space');
    });

    it('handles paths without parameters', () => {
      expect(normalizePath('/api/spaces/space')).toBe('/api/spaces/space');
    });
  });

  describe('buildTerraformApiIndex', () => {
    const testApis: TerraformApi[] = [
      {
        path: '/api/spaces/space',
        methods: ['GET', 'POST'],
        resource: 'elasticstack_kibana_space',
      },
      {
        path: '/api/spaces/space/{id}',
        methods: ['GET', 'PUT', 'DELETE'],
        resource: 'elasticstack_kibana_space',
      },
      {
        path: '/api/fleet/agent_policies',
        methods: ['GET', 'POST'],
        resource: 'elasticstack_fleet_agent_policy',
      },
    ];

    it('builds index with normalized paths', () => {
      const index = buildTerraformApiIndex(testApis);

      expect(index.has('/api/spaces/space')).toBe(true);
      expect(index.has('/api/spaces/space/{param}')).toBe(true);
      expect(index.has('/api/fleet/agent_policies')).toBe(true);
    });

    it('indexes by method', () => {
      const index = buildTerraformApiIndex(testApis);

      const spacesMethods = index.get('/api/spaces/space');
      expect(spacesMethods?.has('GET')).toBe(true);
      expect(spacesMethods?.has('POST')).toBe(true);
      expect(spacesMethods?.has('DELETE')).toBe(false);
    });

    it('returns the API for each method', () => {
      const index = buildTerraformApiIndex(testApis);

      const spacesParamMethods = index.get('/api/spaces/space/{param}');
      const getApi = spacesParamMethods?.get('GET');
      expect(getApi?.resource).toBe('elasticstack_kibana_space');
    });
  });
});
