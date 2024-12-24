/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import globby from 'globby';
import fs from 'fs';
import { SpecDefinitionsService } from '.';
import type { EndpointDefinition, EndpointsAvailability } from '../../common/types';

const mockReadFileSync = jest.spyOn(fs, 'readFileSync');
const mockGlobbySync = jest.spyOn(globby, 'sync');
const mockJsLoadersGetter = jest.fn();

jest.mock('../lib', () => {
  return {
    ...jest.requireActual('../lib'),
    get jsSpecLoaders() {
      return mockJsLoadersGetter();
    },
  };
});

const getMockEndpoint = ({
  endpointName,
  methods,
  patterns,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  data_autocomplete_rules,
  availability,
}: {
  endpointName: string;
  methods?: string[];
  patterns?: string[];
  data_autocomplete_rules?: Record<string, unknown>;
  availability?: Record<EndpointsAvailability, boolean>;
}): EndpointDefinition => ({
  [endpointName]: {
    methods: methods ?? ['GET'],
    patterns: patterns ?? ['/endpoint'],
    data_autocomplete_rules: data_autocomplete_rules ?? undefined,
    availability: availability ?? undefined,
  },
});

describe('SpecDefinitionsService', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date(1577836800000));
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    // mock the function that lists files in the definitions folders
    mockGlobbySync.mockImplementation(() => []);
    // mock the function that reads files
    mockReadFileSync.mockImplementation(() => '');
    // mock the function that returns the list of js definitions loaders
    mockJsLoadersGetter.mockImplementation(() => []);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('initializes with empty definitions when folders and global rules are empty', () => {
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const definitions = specDefinitionsService.asJson();
    expect(definitions).toEqual({
      endpoints: {},
      globals: {},
      name: 'es',
    });
  });

  it('loads globals rules', () => {
    const loadMockAliasRule = (service: SpecDefinitionsService) => {
      service.addGlobalAutocompleteRules('alias', {
        param1: 1,
        param2: 'test',
      });
    };
    const loadMockIndicesRule = (service: SpecDefinitionsService) => {
      service.addGlobalAutocompleteRules('indices', {
        test1: 'param1',
        test2: 'param2',
      });
    };
    mockJsLoadersGetter.mockImplementation(() => [loadMockAliasRule, loadMockIndicesRule]);
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const globals = specDefinitionsService.asJson().globals;
    expect(globals).toEqual({
      alias: {
        param1: 1,
        param2: 'test',
      },
      indices: {
        test1: 'param1',
        test2: 'param2',
      },
    });
  });

  it('loads generated endpoints definition', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json', '/generated/endpoint2.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(getMockEndpoint({ endpointName: 'endpoint1' }));
      }
      if (path.toString() === '/generated/endpoint2.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint2',
            methods: ['POST'],
            patterns: ['/endpoint2'],
          })
        );
      }
      return '';
    });
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const endpoints = specDefinitionsService.asJson().endpoints;
    expect(endpoints).toEqual({
      endpoint1: {
        id: 'endpoint1',
        methods: ['GET'],
        patterns: ['/endpoint'],
      },
      endpoint2: {
        id: 'endpoint2',
        methods: ['POST'],
        patterns: ['/endpoint2'],
      },
    });
  });

  it('overrides an endpoint if override file is present', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json', '/generated/endpoint2.json'];
      }
      if (pattern.includes('overrides')) {
        return ['/overrides/endpoint1.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(getMockEndpoint({ endpointName: 'endpoint1' }));
      }
      if (path.toString() === '/generated/endpoint2.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint2',
            methods: ['POST'],
            patterns: ['/endpoint2'],
          })
        );
      }
      if (path.toString() === '/overrides/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: {
              param1: 'test',
              param2: 2,
            },
          })
        );
      }
      return '';
    });
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const endpoints = specDefinitionsService.asJson().endpoints;
    expect(endpoints).toEqual({
      endpoint1: {
        data_autocomplete_rules: {
          param1: 'test',
          param2: 2,
        },
        id: 'endpoint1',
        methods: ['GET'],
        patterns: ['/endpoint'],
      },
      endpoint2: {
        id: 'endpoint2',
        methods: ['POST'],
        patterns: ['/endpoint2'],
      },
    });
  });

  it('loads manual definitions if any', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('manual')) {
        return ['manual_endpoint.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === 'manual_endpoint.json') {
        return JSON.stringify(getMockEndpoint({ endpointName: 'manual_endpoint' }));
      }
      return '';
    });
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const endpoints = specDefinitionsService.asJson().endpoints;
    expect(endpoints).toEqual({
      manual_endpoint: {
        id: 'manual_endpoint',
        methods: ['GET'],
        patterns: ['/endpoint'],
      },
    });
  });

  it("manual definitions don't override generated files even when the same endpoint name is used", () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['generated_endpoint.json'];
      }
      if (pattern.includes('manual')) {
        return ['manual_endpoint.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === 'generated_endpoint.json') {
        return JSON.stringify(getMockEndpoint({ endpointName: 'test', methods: ['GET'] }));
      }
      if (path.toString() === 'manual_endpoint.json') {
        return JSON.stringify(
          getMockEndpoint({ endpointName: 'test', methods: ['POST'], patterns: ['/manual_test'] })
        );
      }
      return '';
    });
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const endpoints = specDefinitionsService.asJson().endpoints;
    expect(endpoints).toEqual({
      test: {
        id: 'test',
        methods: ['GET'],
        patterns: ['/endpoint'],
      },
      test1577836800000: {
        id: 'test1577836800000',
        methods: ['POST'],
        patterns: ['/manual_test'],
      },
    });
  });

  it('filters out endpoints not available in stack', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json', '/generated/endpoint2.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            availability: { stack: false, serverless: true },
          })
        );
      }
      if (path.toString() === '/generated/endpoint2.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint2',
            methods: ['POST'],
            patterns: ['/endpoint2'],
          })
        );
      }
      return '';
    });
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const endpoints = specDefinitionsService.asJson().endpoints;
    expect(endpoints).toEqual({
      endpoint2: {
        id: 'endpoint2',
        methods: ['POST'],
        patterns: ['/endpoint2'],
      },
    });
  });

  it('filters out endpoints not available in serverless', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json', '/generated/endpoint2.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            availability: { stack: true, serverless: false },
          })
        );
      }
      if (path.toString() === '/generated/endpoint2.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint2',
            methods: ['POST'],
            patterns: ['/endpoint2'],
          })
        );
      }
      return '';
    });
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'serverless',
    });
    const endpoints = specDefinitionsService.asJson().endpoints;
    expect(endpoints).toEqual({
      endpoint2: {
        id: 'endpoint2',
        documentation: 'https://www.elastic.co/docs/api',
        methods: ['POST'],
        patterns: ['/endpoint2'],
      },
    });
  });
});
