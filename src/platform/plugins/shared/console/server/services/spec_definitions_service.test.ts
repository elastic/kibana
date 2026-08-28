/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { SpecDefinitionsService } from '.';
import type { EndpointDefinition, EndpointsAvailability } from '../../common/types';

const mockReadFileSync = jest.spyOn(fs, 'readFileSync');
const mockGlobbySync = jest.spyOn(fs, 'globSync');
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
  data_autocomplete_rules,
  documentation,
  documentation_serverless,
  availability,
}: {
  endpointName: string;
  methods?: string[];
  patterns?: string[];
  data_autocomplete_rules?: Record<string, unknown>;
  documentation?: string;
  documentation_serverless?: string;
  availability?: Record<EndpointsAvailability, boolean>;
}): EndpointDefinition => ({
  [endpointName]: {
    methods: methods ?? ['GET'],
    patterns: patterns ?? ['/endpoint'],
    data_autocomplete_rules: data_autocomplete_rules ?? undefined,
    documentation: documentation ?? undefined,
    documentation_serverless: documentation_serverless ?? undefined,
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

  it('replaces an atomic rule wholesale when the generated and override shapes conflict', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json'];
      }
      if (pattern.includes('overrides')) {
        return ['/overrides/endpoint1.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: {
              // generated shape conflicts with the curated one (array vs object)
              actions: [{ add: { alias: '' } }],
              generated_only_param: '',
            },
          })
        );
      }
      if (path.toString() === '/overrides/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: {
              __template: [{ add: { index: 'test1', alias: 'alias1' } }],
              actions: { __any_of: [{ add: {} }] },
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
    // `actions` is atomic on both sides (generated array vs curated __any_of), so
    // the curated construct replaces it wholesale instead of grafting its keys
    // onto the generated array; generated-only keys still survive
    expect(endpoints.endpoint1.data_autocomplete_rules).toEqual({
      __template: [{ add: { index: 'test1', alias: 'alias1' } }],
      actions: { __any_of: [{ add: {} }] },
      generated_only_param: '',
    });
  });

  it('deep-merges plain-object rules so generated fields survive alongside curated ones', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json'];
      }
      if (pattern.includes('overrides')) {
        return ['/overrides/endpoint1.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: {
              aliases: {
                generated_only: '',
                curated_second: '',
                curated_first: '',
                // generated field rules the curated override does not restate
                '*': { filter: { __scope_link: 'GLOBAL.query' }, routing: '' },
              },
            },
          })
        );
      }
      if (path.toString() === '/overrides/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: {
              // curated __template only adds an insertion scaffold; the compiler
              // skips __-prefixed keys, so the generated field rules must survive
              aliases: {
                __template: { NAME: {} },
                curated_first: 'first',
                curated_second: 'second',
              },
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
    expect(endpoints.endpoint1.data_autocomplete_rules).toEqual({
      aliases: {
        __template: { NAME: {} },
        curated_first: 'first',
        curated_second: 'second',
        generated_only: '',
        '*': { filter: { __scope_link: 'GLOBAL.query' }, routing: '' },
      },
    });
    const aliases = endpoints.endpoint1.data_autocomplete_rules?.aliases;
    if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) {
      throw new Error('Expected merged aliases rules');
    }
    expect(Object.keys(aliases)).toEqual([
      '__template',
      'curated_first',
      'curated_second',
      'generated_only',
      '*',
    ]);
  });

  it('deep-merges a conditional rule before wrapping the merged object', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json'];
      }
      if (pattern.includes('overrides')) {
        return ['/overrides/endpoint1.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: {
              conditional: { generated_field: '' },
            },
          })
        );
      }
      if (path.toString() === '/overrides/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: {
              conditional: { __condition: { lines_regex: '^POST' }, curated_field: '' },
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
    expect(endpoints.endpoint1.data_autocomplete_rules).toEqual({
      conditional: {
        __condition: { lines_regex: '^POST' },
        curated_field: '',
        generated_field: '',
      },
    });
  });

  it('does not pollute a curated atomic rule with generated sibling fields', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json'];
      }
      if (pattern.includes('overrides')) {
        return ['/overrides/endpoint1.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            // generated resolves the field to a rich object the curator rejects
            data_autocomplete_rules: {
              desc: { generated_field: '', another: { __one_of: ['a', 'b'] } },
            },
          })
        );
      }
      if (path.toString() === '/overrides/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            // curated __one_of is atomic and must win without generated siblings
            data_autocomplete_rules: { desc: { __one_of: ['true', 'false'] } },
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
    expect(endpoints.endpoint1.data_autocomplete_rules).toEqual({
      desc: { __one_of: ['true', 'false'] },
    });
  });

  it('replaces rules wholesale when the override rules are a top-level __scope_link', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json'];
      }
      if (pattern.includes('overrides')) {
        return ['/overrides/endpoint1.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: { generated_only_param: '' },
          })
        );
      }
      if (path.toString() === '/overrides/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: { __scope_link: 'other.endpoint' },
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
    // the body compiler redirects the whole body for a top-level __scope_link
    // and ignores sibling keys, so merged generated keys would be dead rules
    expect(endpoints.endpoint1.data_autocomplete_rules).toEqual({
      __scope_link: 'other.endpoint',
    });
  });

  it('keeps generated rules when the override only adds metadata', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json'];
      }
      if (pattern.includes('overrides')) {
        return ['/overrides/endpoint1.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            data_autocomplete_rules: { generated_param: { __one_of: [true, false] } },
          })
        );
      }
      if (path.toString() === '/overrides/endpoint1.json') {
        return JSON.stringify({
          endpoint1: { priority: 10, documentation: 'https://example.com' },
        });
      }
      return '';
    });
    const specDefinitionsService = new SpecDefinitionsService();
    specDefinitionsService.start({
      endpointsAvailability: 'stack',
    });
    const endpoints = specDefinitionsService.asJson().endpoints;
    expect(endpoints.endpoint1).toEqual(
      expect.objectContaining({
        priority: 10,
        documentation: 'https://example.com',
        data_autocomplete_rules: { generated_param: { __one_of: [true, false] } },
      })
    );
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

  it('uses documentation_serverless for serverless endpoints when present', () => {
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
            documentation_serverless: 'https://docs.elastic.co/serverless/endpoint2',
            availability: { stack: true, serverless: true },
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
        availability: { stack: true, serverless: true },
        id: 'endpoint2',
        documentation: 'https://docs.elastic.co/serverless/endpoint2',
        documentation_serverless: 'https://docs.elastic.co/serverless/endpoint2',
        methods: ['POST'],
        patterns: ['/endpoint2'],
      },
    });
  });

  it('falls back to API_DOCS_LINK when documentation_serverless is empty', () => {
    mockGlobbySync.mockImplementation((pattern) => {
      if (pattern.includes('generated')) {
        return ['/generated/endpoint1.json'];
      }
      return [];
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path.toString() === '/generated/endpoint1.json') {
        return JSON.stringify(
          getMockEndpoint({
            endpointName: 'endpoint1',
            methods: ['POST'],
            patterns: ['/endpoint1'],
            documentation_serverless: '   ',
            availability: { stack: true, serverless: true },
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
      endpoint1: {
        availability: { stack: true, serverless: true },
        id: 'endpoint1',
        documentation: 'https://www.elastic.co/docs/api',
        methods: ['POST'],
        patterns: ['/endpoint1'],
      },
    });
  });
});
