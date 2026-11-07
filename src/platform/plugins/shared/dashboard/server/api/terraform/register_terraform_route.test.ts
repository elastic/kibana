/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import supertest from 'supertest';
import { REPO_ROOT } from '@kbn/repo-info';
import type { JsonObject } from '@kbn/utility-types';
import type { SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import type { RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  IDataViewsApiClient,
  PersistenceAPI,
  UiSettingsCommon,
} from '@kbn/data-views-plugin/common';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { registerTerraformRoute, MAX_TERRAFORM_REQUEST_BYTES } from './register_terraform_route';

const mockConvert = jest.fn();
jest.mock('@kbn/as-code-dashboard-terraform', () => {
  const actual = jest.requireActual('@kbn/as-code-dashboard-terraform');
  return {
    ...actual,
    loadDashboardOas: jest.fn().mockResolvedValue({}),
    createDashboardConverter: () => mockConvert,
  };
});

// The route lists related items with the dashboard's own transforms; a panel type registers none unless a test gives
// it some. It parses data views with the real data views service, whose `savedObjectToSpec` uses none of its
// dependencies.
const mockGetTransforms = jest.fn();
const mockDataViewsServiceFactory = jest.fn();
jest.mock('../../kibana_services', () => ({
  embeddableService: { getTransforms: (type: string) => mockGetTransforms(type) },
  dataViewsService: {
    dataViewsServiceFactory: (...args: unknown[]) => mockDataViewsServiceFactory(...args),
  },
}));

const PATH = '/internal/dashboards/_terraform';

describe('POST /internal/dashboards/_terraform', () => {
  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let flagEnabled: boolean;

  const post = (body: object) =>
    supertest(server.listener)
      .post(PATH)
      .set('elastic-api-version', '1')
      .set('x-elastic-internal-origin', 'kibana')
      .set('content-type', 'application/json')
      .send(JSON.stringify(body));

  beforeEach(async () => {
    ({ server, createRouter, handlerContext } = await setupServer());
    logger = loggingSystemMock.createLogger();
    flagEnabled = true;
    mockDataViewsServiceFactory.mockResolvedValue(
      new DataViewsService({
        uiSettings: {} as UiSettingsCommon,
        savedObjectsClient: {} as PersistenceAPI,
        apiClient: {} as IDataViewsApiClient,
        fieldFormats: fieldFormatsMock,
        onNotification: () => {},
        onError: () => {},
        getCanSave: async () => false,
        getCanSaveAdvancedSettings: async () => false,
        scriptedFieldsEnabled: true,
      })
    );
    Object.assign(handlerContext, {
      featureFlags: { getBooleanValue: jest.fn(async () => flagEnabled) },
    });
    const { versioned } = createRouter<RequestHandlerContext>('/');
    registerTerraformRoute(versioned, logger);
    await server.start();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    mockGetTransforms.mockReset();
    await server.stop();
  });

  it('converts a dashboard', async () => {
    mockConvert.mockReturnValueOnce({
      body: { title: 'Logs' },
      droppedFields: [],
      skippedPanels: [],
      partialPanels: [],
      jsonPanels: [],
      references: [],
    });
    const result = await post({ dashboard: { title: 'Logs', panels: [] } });
    expect(result.status).toBe(200);
    expect(result.body.body).toEqual({ title: 'Logs' });
  });

  // Tag tests convert with the real converter, so the dashboard's `tags` produce references.
  const convertForReal = async () => {
    const { createDashboardConverter: createActual, loadDashboardOas: loadActual } =
      jest.requireActual('@kbn/as-code-dashboard-terraform');
    mockConvert.mockImplementationOnce(createActual(await loadActual()));
  };

  it('reads the tags the dashboard references with the user’s client and writes a resource for each readable one', async () => {
    await convertForReal();
    const bulkGet = handlerContext.savedObjects.client.bulkGet as jest.Mock;
    bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'tag-1',
          type: 'tag',
          attributes: { name: 'Production', color: '#772299', description: 'Owned by ${team}' },
          references: [],
        },
        { id: 'tag-2', type: 'tag', error: { statusCode: 403, error: 'Forbidden', message: '' } },
      ],
    });

    const result = await post({
      dashboard: { title: 'Web logs', panels: [], tags: ['tag-1', 'tag-2'] },
    });

    expect(result.status).toBe(200);
    expect(bulkGet).toHaveBeenCalledWith([
      { type: 'tag', id: 'tag-1' },
      { type: 'tag', id: 'tag-2' },
    ]);
    expect(result.body.resource_name).toBe('web_logs');
    expect(result.body.body.tags).toEqual([
      '${elasticstack_kibana_tag.production.tag_id}',
      'tag-2',
    ]);
    expect(result.body.resources).toEqual([
      {
        type: 'elasticstack_kibana_tag',
        name: 'production',
        id: 'tag-1',
        label: 'Production',
        body: { name: 'Production', color: '#772299', description: 'Owned by $${team}' },
      },
    ]);
    expect(result.body.tag_resource).toEqual({
      type: 'elasticstack_kibana_tag',
      min_kibana_version: '9.5.0',
    });
  });

  it('keeps managed and unreadable tags as literal IDs and names them', async () => {
    await convertForReal();
    (handlerContext.savedObjects.client.bulkGet as jest.Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'tag-1',
          type: 'tag',
          attributes: { name: 'Production', color: '#772299', description: '' },
          references: [],
        },
        {
          id: 'managed-tag',
          type: 'tag',
          managed: true,
          attributes: { name: 'Security', color: '#000000', description: '' },
          references: [],
        },
        { id: 'tag-2', type: 'tag', error: { statusCode: 403, error: 'Forbidden', message: '' } },
        { id: 'tag-3', type: 'tag', error: { statusCode: 404, error: 'Not Found', message: '' } },
      ],
    });

    const result = await post({
      dashboard: {
        title: 'Web logs',
        panels: [],
        tags: ['tag-1', 'managed-tag', 'tag-2', 'tag-3'],
      },
    });

    expect(result.status).toBe(200);
    expect(result.body.body.tags).toEqual([
      '${elasticstack_kibana_tag.production.tag_id}',
      'managed-tag',
      'tag-2',
      'tag-3',
    ]);
    expect(result.body.resources.map(({ id }: { id: string }) => id)).toEqual(['tag-1']);
    expect(result.body.literal_tags).toEqual([
      { id: 'managed-tag', reason: 'managed', name: 'Security' },
      { id: 'tag-2', reason: 'unreadable' },
      { id: 'tag-3', reason: 'unreadable' },
    ]);
  });

  it('keeps a tag also used where no reference reaches as a literal ID and names it', async () => {
    await convertForReal();
    (handlerContext.savedObjects.client.bulkGet as jest.Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'tag-1',
          type: 'tag',
          attributes: { name: 'Production', color: '#772299', description: '' },
          references: [],
        },
      ],
    });

    const result = await post({
      dashboard: { title: 'Web logs', description: 'tag-1', panels: [], tags: ['tag-1'] },
    });

    expect(result.body.body.tags).toEqual(['tag-1']);
    expect(result.body.resources).toEqual([]);
    expect(result.body.literal_tags).toEqual([
      { id: 'tag-1', reason: 'unlinkable', name: 'Production' },
    ]);
  });

  it('keeps every tag a literal ID when the user may not read tags at all', async () => {
    await convertForReal();
    (handlerContext.savedObjects.client.bulkGet as jest.Mock).mockRejectedValueOnce(
      SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Unable to bulk_get tag'))
    );

    const result = await post({
      dashboard: { title: 'Web logs', panels: [], tags: ['tag-1', 'tag-2'] },
    });

    expect(result.status).toBe(200);
    expect(result.body.body.tags).toEqual(['tag-1', 'tag-2']);
    expect(result.body.resources).toEqual([]);
    expect(result.body.literal_tags).toEqual([
      { id: 'tag-1', reason: 'unreadable' },
      { id: 'tag-2', reason: 'unreadable' },
    ]);
  });

  describe('data views', () => {
    const control = (dataViewId: string) => ({
      type: 'options_list_control',
      width: 'medium',
      grow: true,
      config: { data_view_id: dataViewId, field_name: 'host.keyword' },
    });
    const dashboard = {
      title: 'Web logs',
      tags: ['tag-1'],
      filters: [
        {
          type: 'condition',
          data_view_id: 'logs-dv',
          condition: { field: 'host.name', operator: 'is', value: 'web-01' },
        },
      ],
      panels: [],
      pinned_panels: [control('logs-dv'), control('metrics-dv'), control('adhoc-dv')],
    };
    const savedDataView = (id: string, attributes: object) => ({
      id,
      type: 'index-pattern',
      attributes,
      references: [],
    });
    type SavedObjectsResponse = Array<{
      id: string;
      type: string;
      error?: { statusCode: number; message: string };
      managed?: boolean;
      namespaces?: string[];
    }>;
    // Answers tags and data views from separate lists, as the route reads each type on its own.
    const mockBulkGet = (tags: SavedObjectsResponse, dataViews: SavedObjectsResponse | Error) =>
      (handlerContext.savedObjects.client.bulkGet as jest.Mock).mockImplementation(
        async (objects: Array<{ type: string }>) => {
          if (objects[0]?.type === 'tag') return { saved_objects: tags };
          if (dataViews instanceof Error) throw dataViews;
          return { saved_objects: dataViews };
        }
      );
    const tag = {
      id: 'tag-1',
      type: 'tag',
      attributes: { name: 'Production', color: '#772299', description: '' },
      references: [],
    };
    const controlDataViews = (body: { pinned_panels: Array<Record<string, unknown>> }) =>
      body.pinned_panels.map(
        (panel) =>
          (panel.options_list_control_config as { by_field: { data_view_id: string } }).by_field
            .data_view_id
      );

    it('reads the data views with the user’s client and points every use of a readable one at its resource', async () => {
      await convertForReal();
      mockBulkGet(
        [tag],
        [
          savedDataView('logs-dv', {
            title: 'logs-*',
            name: 'Web logs',
            timeFieldName: '@timestamp',
          }),
          savedDataView('metrics-dv', { title: 'metrics-${env}-*' }),
          { id: 'adhoc-dv', type: 'index-pattern', error: { statusCode: 404, message: '' } },
        ]
      );

      const result = await post({ dashboard });

      expect(result.status).toBe(200);
      expect(handlerContext.savedObjects.client.bulkGet).toHaveBeenCalledWith([
        { type: 'index-pattern', id: 'logs-dv' },
        { type: 'index-pattern', id: 'metrics-dv' },
        { type: 'index-pattern', id: 'adhoc-dv' },
      ]);
      const reference = '${elasticstack_kibana_data_view.web_logs.data_view.id}';
      expect(JSON.parse(result.body.body.filters[0].filter_json).data_view_id).toBe(reference);
      expect(controlDataViews(result.body.body)).toEqual([
        reference,
        '${elasticstack_kibana_data_view.metrics_env.data_view.id}',
        'adhoc-dv',
      ]);
      expect(result.body.resources).toEqual([
        expect.objectContaining({ type: 'elasticstack_kibana_tag', name: 'production' }),
        {
          type: 'elasticstack_kibana_data_view',
          name: 'web_logs',
          id: 'logs-dv',
          label: 'Web logs',
          body: {
            data_view: { title: 'logs-*', name: 'Web logs', time_field_name: '@timestamp' },
          },
        },
        {
          type: 'elasticstack_kibana_data_view',
          name: 'metrics_env',
          id: 'metrics-dv',
          label: 'metrics-${env}-*',
          body: { data_view: { title: 'metrics-$${env}-*' } },
        },
      ]);
      expect(result.body.data_view_resource).toEqual({ type: 'elasticstack_kibana_data_view' });
      expect(result.body.literal_data_views).toEqual([{ id: 'adhoc-dv', reason: 'not_found' }]);
    });

    it('keeps managed, unreadable and ad hoc data views as literal IDs beside a saved one, and names them', async () => {
      await convertForReal();
      mockBulkGet(
        [tag],
        [
          savedDataView('web-dv', { title: 'web-*', name: 'Web' }),
          // Fleet installs its `logs-*` data view, with that ID, as a managed saved object.
          { ...savedDataView('logs-*', { title: 'logs-*', name: 'logs-*' }), managed: true },
          { id: 'hidden-dv', type: 'index-pattern', error: { statusCode: 403, message: '' } },
          { id: 'adhoc-dv', type: 'index-pattern', error: { statusCode: 404, message: '' } },
        ]
      );

      const result = await post({
        dashboard: {
          ...dashboard,
          filters: [],
          pinned_panels: ['web-dv', 'logs-*', 'hidden-dv', 'adhoc-dv'].map(control),
        },
      });

      expect(result.status).toBe(200);
      expect(controlDataViews(result.body.body)).toEqual([
        '${elasticstack_kibana_data_view.web.data_view.id}',
        'logs-*',
        'hidden-dv',
        'adhoc-dv',
      ]);
      expect(result.body.resources.map(({ id }: { id: string }) => id)).toEqual([
        'tag-1',
        'web-dv',
      ]);
      expect(result.body.literal_data_views).toEqual([
        { id: 'logs-*', reason: 'managed', name: 'logs-*' },
        { id: 'hidden-dv', reason: 'unreadable' },
        { id: 'adhoc-dv', reason: 'not_found' },
      ]);
    });

    it('returns the spaces each exported data view is currently shared to', async () => {
      await convertForReal();
      mockBulkGet(
        [tag],
        [
          { ...savedDataView('logs-dv', { title: 'logs-*' }), namespaces: ['default', 'ops'] },
          { ...savedDataView('metrics-dv', { title: 'metrics-*' }), namespaces: ['*'] },
          { id: 'adhoc-dv', type: 'index-pattern', error: { statusCode: 404, message: '' } },
        ]
      );

      const result = await post({ dashboard });

      expect(result.body.data_views).toEqual([
        expect.objectContaining({ id: 'logs-dv', namespaces: ['default', 'ops'] }),
        expect.objectContaining({ id: 'metrics-dv', namespaces: ['*'] }),
      ]);
    });

    it('keeps a data view literal everywhere when one of its uses cannot be linked, and says why', async () => {
      await convertForReal();
      mockBulkGet([tag], [savedDataView('logs-dv', { title: 'logs-*', name: 'Web logs' })]);

      const result = await post({
        dashboard: {
          ...dashboard,
          pinned_panels: [control('logs-dv')],
          // An ID where no reference annotation reaches.
          description: 'logs-dv',
        },
      });

      expect(JSON.parse(result.body.body.filters[0].filter_json).data_view_id).toBe('logs-dv');
      expect(result.body.resources.map(({ type }: { type: string }) => type)).toEqual([
        'elasticstack_kibana_tag',
      ]);
      expect(result.body.literal_data_views).toEqual([
        { id: 'logs-dv', reason: 'unlinkable', name: 'Web logs' },
      ]);
    });

    it('maps each data view’s settings, parsed by the data views service, onto its resource, with its index pattern and the settings it drops', async () => {
      await convertForReal();
      mockBulkGet(
        [tag],
        [
          savedDataView('logs-dv', {
            title: 'logs-${env}-*',
            name: 'Web logs',
            allowNoIndex: true,
            allowHidden: true,
            sourceFilters: JSON.stringify([{ value: 'secret.*' }]),
            fieldFormatMap: JSON.stringify({
              bytes: { id: 'bytes', params: { pattern: '0b', unsupported: 1 } },
            }),
            // Stored as a string by an old bug (#211109); the data views service repairs it.
            fieldAttrs: JSON.stringify({ host: { count: '4' } }),
          }),
        ]
      );

      const result = await post({ dashboard: { ...dashboard, pinned_panels: [] } });

      expect(result.body.resources[1].body).toEqual({
        data_view: {
          title: 'logs-$${env}-*',
          name: 'Web logs',
          allow_no_index: true,
          source_filters: ['secret.*'],
          field_formats: { bytes: { id: 'bytes', params: { pattern: '0b' } } },
          field_attrs: { host: { count: 4 } },
        },
      });
      expect(mockDataViewsServiceFactory).toHaveBeenCalledWith(
        handlerContext.savedObjects.client,
        expect.anything(),
        expect.anything()
      );
      expect(result.body.data_views).toEqual([
        {
          id: 'logs-dv',
          index_pattern: 'logs-${env}-*',
          dropped_fields: ['allowHidden', 'fieldFormats.bytes.params.unsupported'],
          namespaces: [],
        },
      ]);
    });

    it('keeps every data view a literal ID when the user may not read data views at all', async () => {
      await convertForReal();
      mockBulkGet(
        [tag],
        SavedObjectsErrorHelpers.decorateForbiddenError(
          new Error('Unable to bulk_get index-pattern')
        )
      );

      const result = await post({ dashboard });

      expect(result.status).toBe(200);
      expect(controlDataViews(result.body.body)).toEqual(['logs-dv', 'metrics-dv', 'adhoc-dv']);
      expect(result.body.literal_data_views).toEqual([
        { id: 'logs-dv', reason: 'unreadable' },
        { id: 'metrics-dv', reason: 'unreadable' },
        { id: 'adhoc-dv', reason: 'unreadable' },
      ]);
    });
  });

  it.each([
    ['2024 Q1 — Ünïcode!', '_2024_q1_unicode'],
    ['!!!', 'dashboard'],
    ['', 'dashboard'],
  ])('names the resource of "%s" %s', async (title, name) => {
    mockConvert.mockReturnValueOnce({
      body: { title },
      droppedFields: [],
      skippedPanels: [],
      partialPanels: [],
      jsonPanels: [],
      references: [],
    });
    const result = await post({ dashboard: { title, panels: [] } });
    expect(result.body.resource_name).toBe(name);
  });

  it('lists every saved object the dashboard refers to, beyond the 100 the sanitize step returns', async () => {
    await convertForReal();
    const tags = Array.from({ length: 120 }, (_, i) => `tag-${i}`);
    (handlerContext.savedObjects.client.bulkGet as jest.Mock).mockImplementation(
      async (objects: Array<{ type: string; id: string }>) => ({
        saved_objects: objects.map(({ type, id }) => ({ id, type, error: { statusCode: 404 } })),
      })
    );

    const result = await post({
      dashboard: {
        title: 'Logs',
        panels: [],
        tags,
        filters: [
          {
            type: 'condition',
            data_view_id: 'logs-dv',
            condition: { field: 'host.name', operator: 'is', value: 'web-01' },
          },
        ],
      },
    });

    expect(result.status).toBe(200);
    expect(result.body.related_items).toHaveLength(121);
    expect(result.body.related_items).toContainEqual({
      type: 'tag',
      type_label: 'tag',
      id: 'tag-119',
    });
    expect(result.body.related_items).toContainEqual({
      type: 'index-pattern',
      type_label: 'index-pattern',
      id: 'logs-dv',
    });
  });

  it('reads no tags for a dashboard without any', async () => {
    mockConvert.mockReturnValueOnce({
      body: { title: 'Logs' },
      droppedFields: [],
      skippedPanels: [],
      partialPanels: [],
      jsonPanels: [],
      references: [],
    });
    const result = await post({ dashboard: { title: 'Logs', panels: [] } });
    expect(result.status).toBe(200);
    expect(handlerContext.savedObjects.client.bulkGet).not.toHaveBeenCalled();
    expect(result.body.resources).toEqual([]);
    expect(result.body.library_items).toEqual([]);
  });

  describe('library items', () => {
    // Every library panel type stores its library item as the panel reference named `savedObjectRef`.
    const byReferenceTransforms = (libraryType: string) => ({
      transformIn: ({ ref_id: refId, ...state }: { ref_id: string }) => ({
        state,
        references: [{ name: 'savedObjectRef', type: libraryType, id: refId }],
      }),
    });
    const visByReference: JsonObject = JSON.parse(
      readFileSync(
        join(
          REPO_ROOT,
          'src/platform/packages/shared/as-code/dashboard-terraform/src/__fixtures__/vis_by_reference.json'
        ),
        'utf8'
      )
    );

    it('names the library item of a by-reference panel and keeps the panel by reference', async () => {
      await convertForReal();
      mockGetTransforms.mockImplementation((type: string) =>
        type === 'vis' ? byReferenceTransforms('lens') : undefined
      );
      const bulkGet = handlerContext.savedObjects.client.bulkGet as jest.Mock;
      bulkGet.mockResolvedValueOnce({
        saved_objects: [
          { id: 'lensRef', type: 'lens', attributes: { title: 'Requests' }, references: [] },
        ],
      });

      const result = await post({ dashboard: visByReference });

      expect(result.status).toBe(200);
      expect(bulkGet).toHaveBeenCalledWith([{ type: 'lens', id: 'lensRef', fields: ['title'] }]);
      expect(result.body.library_items).toEqual([
        { type: 'lens', type_label: 'lens', id: 'lensRef', title: 'Requests' },
      ]);
      expect(result.body.body.panels[0].vis_config.by_reference.ref_id).toBe('lensRef');
    });

    it('says when a library item no longer exists or the user cannot read it', async () => {
      await convertForReal();
      mockGetTransforms.mockImplementation((type: string) =>
        type === 'markdown' ? byReferenceTransforms('markdown') : undefined
      );
      (handlerContext.savedObjects.client.bulkGet as jest.Mock).mockResolvedValueOnce({
        saved_objects: [
          { id: 'gone', type: 'markdown', error: { statusCode: 404, error: 'Not Found' } },
          { id: 'secret', type: 'markdown', error: { statusCode: 403, error: 'Forbidden' } },
        ],
      });
      const panel = (refId: string, y: number) => ({
        type: 'markdown',
        grid: { x: 0, y, w: 24, h: 10 },
        config: { ref_id: refId },
      });

      const result = await post({
        dashboard: { title: 'Notes', panels: [panel('gone', 0), panel('secret', 10)] },
      });

      expect(result.status).toBe(200);
      expect(result.body.library_items).toEqual([
        { type: 'markdown', type_label: 'markdown', id: 'gone', reason: 'not_found' },
        { type: 'markdown', type_label: 'markdown', id: 'secret', reason: 'unreadable' },
      ]);
    });

    it('reports every library item unreadable when the user may not read their type at all', async () => {
      await convertForReal();
      mockGetTransforms.mockImplementation((type: string) =>
        type === 'vis' ? byReferenceTransforms('lens') : undefined
      );
      (handlerContext.savedObjects.client.bulkGet as jest.Mock).mockRejectedValueOnce(
        SavedObjectsErrorHelpers.decorateForbiddenError(new Error('Unable to bulk_get lens'))
      );

      const result = await post({ dashboard: visByReference });

      expect(result.status).toBe(200);
      expect(result.body.library_items).toEqual([
        { type: 'lens', type_label: 'lens', id: 'lensRef', reason: 'unreadable' },
      ]);
    });
  });

  it('rejects a body larger than the bound without converting it', async () => {
    const title = 'x'.repeat(MAX_TERRAFORM_REQUEST_BYTES);
    const result = await post({ dashboard: { title, panels: [] } });
    expect(result.status).toBe(413);
    expect(mockConvert).not.toHaveBeenCalled();
  });

  it('rejects a title longer than the as-code title limit without converting it', async () => {
    const result = await post({ dashboard: { title: 'x'.repeat(1001), panels: [] } });
    expect(result.status).toBe(400);
    expect(JSON.parse(result.body.message)).toEqual([
      expect.objectContaining({ code: 'too_big', path: ['dashboard', 'title'] }),
    ]);
    expect(mockConvert).not.toHaveBeenCalled();
  });

  it('returns the conversion error for input the resource cannot hold', async () => {
    const { DashboardConversionError } = jest.requireActual('@kbn/as-code-dashboard-terraform');
    mockConvert.mockImplementationOnce(() => {
      throw new DashboardConversionError('panels: expected a list');
    });
    const result = await post({ dashboard: { title: 'Logs', panels: {} } });
    expect(result.status).toBe(400);
    expect(result.body.message).toBe('panels: expected a list');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs a failing converter with context and answers with a generic server error', async () => {
    mockConvert.mockImplementationOnce(() => {
      throw new Error('secret internal detail');
    });
    const result = await post({
      dashboard: {
        title: 'Private title',
        panels: [{ type: 'lens' }, { title: 'Private section', panels: [{ type: 'markdown' }] }],
        pinned_panels: [{ type: 'options_list_control' }],
      },
    });
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain('secret internal detail');
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message] = logger.error.mock.calls[0];
    expect(message).toContain(`POST ${PATH}`);
    expect(message).toContain(
      'panels [lens, section, markdown], pinned panels [options_list_control]'
    );
    expect(message).not.toContain('Private');
    expect(message).toContain('secret internal detail');
  });

  it('is not found while the feature flag is off', async () => {
    flagEnabled = false;
    const result = await post({ dashboard: { title: 'Logs', panels: [] } });
    expect(result.status).toBe(404);
  });
});
