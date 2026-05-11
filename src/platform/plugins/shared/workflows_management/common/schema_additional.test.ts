/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createMockConnectorInstance,
  createMockConnectorTypeInfo,
} from './mocks/connector_type_info';
import {
  addDynamicConnectorsToCache,
  convertDynamicConnectorsToContracts,
  getAllConnectorsInternal,
  getAllConnectorsWithDynamic,
  getCachedAllConnectorsMap,
  getCachedDynamicConnectorTypes,
  getDeprecatedStepMetadataMap,
} from './schema';

describe('schema - additional coverage', () => {
  describe('getAllConnectorsInternal', () => {
    it('should include the console connector', () => {
      const connectors = getAllConnectorsInternal();
      const consoleConnector = connectors.find((c) => c.type === 'console');
      expect(consoleConnector).toBeDefined();
      expect(consoleConnector?.summary).toBeDefined();
    });

    it('should include elasticsearch connectors', () => {
      const connectors = getAllConnectorsInternal();
      const esConnectors = connectors.filter((c) => c.type.startsWith('elasticsearch.'));
      expect(esConnectors.length).toBeGreaterThan(0);
    });

    it('should include kibana connectors', () => {
      const connectors = getAllConnectorsInternal();
      const kibanaConnectors = connectors.filter((c) => c.type.startsWith('kibana.'));
      expect(kibanaConnectors.length).toBeGreaterThan(0);
    });

    it('should return cached result on subsequent calls', () => {
      const first = getAllConnectorsInternal();
      const second = getAllConnectorsInternal();
      expect(first).toBe(second);
    });
  });

  describe('getDeprecatedStepMetadataMap', () => {
    it('should freeze the cached metadata map', () => {
      const metadata = getDeprecatedStepMetadataMap();

      expect(Object.isFrozen(metadata)).toBe(true);
    });

    it('should return the same cached frozen object on subsequent calls', () => {
      const first = getDeprecatedStepMetadataMap();
      const second = getDeprecatedStepMetadataMap();

      expect(first).toBe(second);
      expect(Object.isFrozen(second)).toBe(true);
    });
  });

  describe('getAllConnectorsWithDynamic', () => {
    it('should return base connectors when no dynamic types provided', () => {
      const result = getAllConnectorsWithDynamic();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return base connectors when empty object provided', () => {
      const result = getAllConnectorsWithDynamic({});
      expect(result.length).toBeGreaterThan(0);
    });

    it('should add dynamic connectors', () => {
      const dynamicTypes = {
        '.my-dynamic-test-type': createMockConnectorTypeInfo({
          actionTypeId: '.my-dynamic-test-type',
          displayName: 'My Dynamic Type',
        }),
      };

      const result = getAllConnectorsWithDynamic(dynamicTypes);
      const found = result.find((c) => c.type === 'my-dynamic-test-type');
      expect(found).toBeDefined();
      expect(found?.description).toContain('My Dynamic Type');
    });

    it('should not add duplicate types that exist in static connectors', () => {
      const dynamicTypes = {
        '.dup-type-test': createMockConnectorTypeInfo({
          actionTypeId: '.dup-type-test',
          displayName: 'Dup Type',
        }),
      };

      const result = getAllConnectorsWithDynamic(dynamicTypes);
      const dupEntries = result.filter((c) => c.type === 'dup-type-test');
      expect(dupEntries.length).toBeLessThanOrEqual(1);
    });

    it('should skip disabled dynamic connectors', () => {
      const dynamicTypes = {
        '.disabled-test-type': createMockConnectorTypeInfo({
          actionTypeId: '.disabled-test-type',
          displayName: 'Disabled',
          enabled: false,
        }),
      };

      const result = getAllConnectorsWithDynamic(dynamicTypes);
      const found = result.find((c) => c.type === 'disabled-test-type');
      expect(found).toBeUndefined();
    });
  });

  describe('convertDynamicConnectorsToContracts', () => {
    it('should convert a connector without sub-actions to a single contract', () => {
      const types = {
        '.simple-action': createMockConnectorTypeInfo({
          actionTypeId: '.simple-action',
          displayName: 'Simple Action',
          instances: [createMockConnectorInstance({ id: 'i1', name: 'Instance 1' })],
        }),
      };

      const contracts = convertDynamicConnectorsToContracts(types);
      expect(contracts).toHaveLength(1);
      expect(contracts[0].type).toBe('simple-action');
      expect(contracts[0].summary).toBe('Simple Action');
      expect(contracts[0].description).toBe('Simple Action connector');
    });

    it('should create sub-action contracts for connectors with subActions', () => {
      const types = {
        '.inference': createMockConnectorTypeInfo({
          actionTypeId: '.inference',
          displayName: 'Inference',
          subActions: [
            { name: 'completion', displayName: 'Completion' },
            { name: 'rerank', displayName: 'Rerank' },
            { name: 'textEmbedding', displayName: 'Text Embedding' },
          ],
        }),
      };

      const contracts = convertDynamicConnectorsToContracts(types);
      expect(contracts).toHaveLength(3);
      expect(contracts.map((c) => c.type)).toEqual([
        'inference.completion',
        'inference.rerank',
        'inference.textEmbedding',
      ]);
    });

    it('should skip disabled connectors', () => {
      const types = {
        '.disabled': createMockConnectorTypeInfo({
          actionTypeId: '.disabled',
          displayName: 'Disabled',
          enabled: false,
        }),
      };

      const contracts = convertDynamicConnectorsToContracts(types);
      expect(contracts).toHaveLength(0);
    });

    it('should handle connector with empty subActions array as fallback', () => {
      const types = {
        '.no-subs': createMockConnectorTypeInfo({
          actionTypeId: '.no-subs',
          displayName: 'No Subs',
          subActions: [],
        }),
      };

      const contracts = convertDynamicConnectorsToContracts(types);
      expect(contracts).toHaveLength(1);
      expect(contracts[0].type).toBe('no-subs');
    });

    it('should include instances in the contract', () => {
      const instances = [
        createMockConnectorInstance({ id: 'inst-1', name: 'First' }),
        createMockConnectorInstance({ id: 'inst-2', name: 'Second' }),
      ];

      const types = {
        '.with-instances': createMockConnectorTypeInfo({
          actionTypeId: '.with-instances',
          displayName: 'With Instances',
          instances,
        }),
      };

      const contracts = convertDynamicConnectorsToContracts(types);
      expect(contracts[0]).toHaveProperty('instances', instances);
    });
  });

  describe('addDynamicConnectorsToCache', () => {
    it('should store dynamic connector types in cache', () => {
      const dynamicTypes = {
        '.cache-test-action': createMockConnectorTypeInfo({
          actionTypeId: '.cache-test-action',
          displayName: 'Cache Test',
        }),
      };

      addDynamicConnectorsToCache(dynamicTypes);

      const cached = getCachedDynamicConnectorTypes();
      expect(cached).not.toBeNull();
      expect(cached?.['.cache-test-action']).toBeDefined();
    });

    it('should update the all-connectors map cache', () => {
      const dynamicTypes = {
        '.map-cache-test': createMockConnectorTypeInfo({
          actionTypeId: '.map-cache-test',
          displayName: 'Map Cache Test',
        }),
      };

      addDynamicConnectorsToCache(dynamicTypes);

      const map = getCachedAllConnectorsMap();
      expect(map).not.toBeNull();
      expect(map?.has('map-cache-test')).toBe(true);
    });

    it('should skip reprocessing when types hash has not changed', () => {
      const dynamicTypes = {
        '.stable-hash-test': createMockConnectorTypeInfo({
          actionTypeId: '.stable-hash-test',
          displayName: 'Stable Hash',
        }),
      };

      addDynamicConnectorsToCache(dynamicTypes);
      const firstMap = getCachedAllConnectorsMap();

      addDynamicConnectorsToCache(dynamicTypes);
      const secondMap = getCachedAllConnectorsMap();

      expect(firstMap).toBe(secondMap);
    });

    it('should rebuild cache when enabled flag changes', () => {
      addDynamicConnectorsToCache({
        '.toggle-test': createMockConnectorTypeInfo({
          actionTypeId: '.toggle-test',
          displayName: 'Toggle Test',
        }),
      });
      const firstMap = getCachedAllConnectorsMap();
      expect(firstMap?.has('toggle-test')).toBe(true);

      addDynamicConnectorsToCache({
        '.toggle-test': createMockConnectorTypeInfo({
          actionTypeId: '.toggle-test',
          displayName: 'Toggle Test',
          enabled: false,
        }),
      });
      const secondMap = getCachedAllConnectorsMap();
      expect(secondMap).not.toBe(firstMap);
      expect(secondMap?.has('toggle-test')).toBe(false);
    });

    it('should handle dynamic connectors with sub-actions', () => {
      const dynamicTypes = {
        '.sub-action-test': createMockConnectorTypeInfo({
          actionTypeId: '.sub-action-test',
          displayName: 'Sub Action Test',
          subActions: [
            { name: 'doA', displayName: 'Do A' },
            { name: 'doB', displayName: 'Do B' },
          ],
        }),
      };

      addDynamicConnectorsToCache(dynamicTypes);

      const map = getCachedAllConnectorsMap();
      expect(map?.has('sub-action-test.doA')).toBe(true);
      expect(map?.has('sub-action-test.doB')).toBe(true);
    });

    it('should allow lookup by type after caching', () => {
      const dynamicTypes = {
        '.lookup-test': createMockConnectorTypeInfo({
          actionTypeId: '.lookup-test',
          displayName: 'Lookup Test',
        }),
      };

      addDynamicConnectorsToCache(dynamicTypes);

      const map = getCachedAllConnectorsMap();
      const connector = map?.get('lookup-test');
      expect(connector).toBeDefined();
      expect(connector?.summary).toBe('Lookup Test');
    });
  });
});
