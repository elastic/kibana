/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { mergeDashboards } = require('./merge_dashboards_oas');

const schemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });
const jsonContent = (schema) => ({ content: { 'application/json': { schema } } });
const productTags = [{ name: 'product_name', content: 'Kibana' }];

const kibanaSpec = () => ({
  openapi: '3.0.3',
  info: { title: 'Kibana APIs', version: '1.0.0' },
  tags: [
    { name: 'Dashboards', description: 'placeholder', 'x-displayName': 'Dashboards' },
    { name: 'Spaces' },
  ],
  paths: {
    '/api/dashboards': {
      get: { operationId: 'search-dashboards', description: 'placeholder' },
      post: { operationId: 'create-dashboard', description: 'placeholder' },
    },
    '/api/dashboards/{id}': {
      get: { operationId: 'get-dashboard', description: 'placeholder' },
    },
    '/api/spaces/space': {
      get: {
        operationId: 'get-spaces-space',
        'x-metaTags': productTags,
        responses: { 200: jsonContent(schemaRef('Spaces_space')) },
      },
    },
  },
  components: {
    schemas: {
      // Same name as a dashboards schema, but described differently.
      shared_filter: { type: 'object', description: 'Kibana filter', properties: { kbn: {} } },
      Spaces_space: { type: 'object', properties: { id: { type: 'string' } } },
    },
    securitySchemes: { apiKeyAuth: { type: 'apiKey' } },
  },
});

const dashboardsSpec = () => ({
  openapi: '3.0.3',
  info: { title: 'Kibana Dashboards API', version: '' },
  tags: [{ name: 'Dashboards', description: 'full description', externalDocs: { url: 'x' } }],
  paths: {
    '/api/dashboards': {
      get: {
        operationId: 'get-dashboards',
        responses: { 200: jsonContent(schemaRef('dashboard_list')) },
      },
      post: {
        operationId: 'post-dashboards',
        requestBody: jsonContent(schemaRef('shared_filter')),
      },
    },
    '/api/dashboards/{id}': {
      get: { operationId: 'get-dashboards-id' },
      put: { operationId: 'put-dashboards-id' },
    },
  },
  components: {
    schemas: {
      shared_filter: { type: 'object', description: 'Dashboards filter' },
      dashboard_list: {
        type: 'object',
        properties: {
          dashboards: { type: 'array', items: schemaRef('dashboard') },
          filter: schemaRef('shared_filter'),
        },
      },
      dashboard: {
        allOf: [schemaRef('shared_filter'), { oneOf: [schemaRef('panel'), schemaRef('section')] }],
      },
      panel: { type: 'object' },
      section: { type: 'object', properties: { panels: { items: schemaRef('panel') } } },
    },
  },
});

const collectSchemaRefs = (node, refs = []) => {
  if (Array.isArray(node)) {
    node.forEach((child) => collectSchemaRefs(child, refs));
  } else if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) =>
      key === '$ref' ? refs.push(value) : collectSchemaRefs(value, refs)
    );
  }
  return refs;
};

describe('mergeDashboards', () => {
  it('replaces the placeholder dashboards operations with the full ones', () => {
    const { spec } = mergeDashboards(kibanaSpec(), dashboardsSpec());

    expect(Object.keys(spec.paths['/api/dashboards'])).toEqual(['get', 'post']);
    expect(spec.paths['/api/dashboards'].get.operationId).toBe('get-dashboards');
    expect(spec.paths['/api/dashboards'].post.operationId).toBe('post-dashboards');
    expect(Object.keys(spec.paths['/api/dashboards/{id}'])).toEqual(['get', 'put']);
  });

  it('renames colliding dashboards schemas and keeps the Kibana ones intact', () => {
    const { spec, renamed } = mergeDashboards(kibanaSpec(), dashboardsSpec());

    expect(renamed).toBe(1);
    expect(spec.components.schemas.shared_filter).toEqual(kibanaSpec().components.schemas.shared_filter);
    expect(spec.components.schemas.Dashboards_API_shared_filter).toEqual({
      type: 'object',
      description: 'Dashboards filter',
    });
  });

  it('adds the non-colliding dashboards schemas under their own names', () => {
    const { spec, added } = mergeDashboards(kibanaSpec(), dashboardsSpec());

    expect(added).toBe(5);
    ['dashboard_list', 'dashboard', 'panel', 'section'].forEach((name) =>
      expect(spec.components.schemas[name]).toBeDefined()
    );
    expect(spec.components.schemas.panel).toEqual(dashboardsSpec().components.schemas.panel);
    expect(spec.components.schemas.Dashboards_API_dashboard_list).toBeUndefined();
  });

  it('points renamed references at the renamed schema, in paths and nested in schemas', () => {
    const { spec } = mergeDashboards(kibanaSpec(), dashboardsSpec());
    const renamedRef = '#/components/schemas/Dashboards_API_shared_filter';

    expect(
      spec.paths['/api/dashboards'].post.requestBody.content['application/json'].schema.$ref
    ).toBe(renamedRef);
    expect(spec.components.schemas.dashboard_list.properties.filter.$ref).toBe(renamedRef);
    expect(spec.components.schemas.dashboard.allOf[0].$ref).toBe(renamedRef);
  });

  it('leaves references to non-colliding schemas untouched', () => {
    const { spec } = mergeDashboards(kibanaSpec(), dashboardsSpec());

    expect(spec.components.schemas.dashboard_list.properties.dashboards.items.$ref).toBe(
      '#/components/schemas/dashboard'
    );
    expect(spec.components.schemas.dashboard.allOf[1].oneOf).toEqual([
      schemaRef('panel'),
      schemaRef('section'),
    ]);
    expect(spec.components.schemas.section.properties.panels.items.$ref).toBe(
      '#/components/schemas/panel'
    );
  });

  it('leaves no schema reference unresolved', () => {
    const { spec } = mergeDashboards(kibanaSpec(), dashboardsSpec());

    const unresolved = collectSchemaRefs(spec).filter(
      (ref) => !(ref.slice('#/components/schemas/'.length) in spec.components.schemas)
    );
    expect(unresolved).toEqual([]);
  });

  it('does not change the unrelated Kibana operations, schemas and metadata', () => {
    const original = kibanaSpec();
    const { spec } = mergeDashboards(kibanaSpec(), dashboardsSpec());

    expect(spec.paths['/api/spaces/space']).toEqual(original.paths['/api/spaces/space']);
    expect(spec.components.schemas.Spaces_space).toEqual(original.components.schemas.Spaces_space);
    expect(spec.components.securitySchemes).toEqual(original.components.securitySchemes);
    expect(spec.info).toEqual(original.info);
    expect(spec.tags.find((tag) => tag.name === 'Spaces')).toEqual({ name: 'Spaces' });
  });

  it('copies the product tags to the dashboards operations', () => {
    const { spec } = mergeDashboards(kibanaSpec(), dashboardsSpec());

    ['get', 'post'].forEach((method) =>
      expect(spec.paths['/api/dashboards'][method]['x-metaTags']).toEqual(productTags)
    );
    ['get', 'put'].forEach((method) =>
      expect(spec.paths['/api/dashboards/{id}'][method]['x-metaTags']).toEqual(productTags)
    );
  });

  it('replaces the Dashboards tag content and keeps its Kibana extensions', () => {
    const { spec } = mergeDashboards(kibanaSpec(), dashboardsSpec());

    expect(spec.tags.find((tag) => tag.name === 'Dashboards')).toEqual({
      name: 'Dashboards',
      description: 'full description',
      externalDocs: { url: 'x' },
      'x-displayName': 'Dashboards',
    });
  });

  it.each(['kibana', 'dashboards'])('throws when the %s spec lacks a dashboards path', (which) => {
    const kibana = kibanaSpec();
    const dashboards = dashboardsSpec();
    delete (which === 'kibana' ? kibana : dashboards).paths['/api/dashboards/{id}'];

    expect(() => mergeDashboards(kibana, dashboards)).toThrow(/missing expected paths/);
  });
});
