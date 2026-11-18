/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { coreMock } from '@kbn/core/server/mocks';
import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import { optionsListDSLControlSchema } from '@kbn/controls-schemas';
import {
  createEmbeddableSetupMock,
  createEmbeddableStartMock,
} from '@kbn/embeddable-plugin/server/mocks';
import {
  expectApiBodyEntryRoundTrip,
  savedObjectsManagementPluginMock,
} from '@kbn/saved-objects-management-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import { setKibanaServices } from '../kibana_services';
import { createDashboardApiBodyEntry } from './api_body_entry';

// A library panel: its config holds the library item's ID, which the stored panel keeps as a reference.
const BY_REFERENCE_PANEL = 'test_by_reference_panel';
const byReferencePanelSchema = z
  .object({ ref_id: z.string(), title: z.string().optional() })
  .strict();

const findReference = (references: SavedObjectReference[] = [], name: string) =>
  references.find((reference) => reference.name === name)?.id;

type ByReferencePanelState = z.output<typeof byReferencePanelSchema>;
type StoredByReferencePanelState = Omit<ByReferencePanelState, 'ref_id'> & {
  savedObjectRefName: string;
};
type OptionsListControlState = Extract<
  z.output<typeof optionsListDSLControlSchema>,
  { data_view_id: string }
>;
type StoredOptionsListControlState = Omit<OptionsListControlState, 'data_view_id'> & {
  dataViewRefName: string;
};

const embeddableSetup = createEmbeddableSetupMock();
embeddableSetup.registerEmbeddableServerDefinition(BY_REFERENCE_PANEL, {
  title: 'By-reference panel',
  getSchema: () => byReferencePanelSchema,
  getTransforms: () => ({
    transformIn: ({ ref_id: refId, ...rest }: ByReferencePanelState) => ({
      state: { ...rest, savedObjectRefName: 'savedObjectRef' },
      references: [{ name: 'savedObjectRef', type: 'lens', id: refId }],
    }),
    transformOut: (
      { savedObjectRefName, ...rest }: StoredByReferencePanelState,
      panelReferences?: SavedObjectReference[]
    ) => ({
      ...rest,
      ref_id: findReference(panelReferences, savedObjectRefName) ?? '',
    }),
  }),
});
// Mirrors the controls plugin's options list transforms, which move the data view ID into a reference.
embeddableSetup.registerEmbeddableServerDefinition(OPTIONS_LIST_CONTROL, {
  title: 'Options list control',
  getSchema: () => optionsListDSLControlSchema,
  getTransforms: () => ({
    transformIn: ({ data_view_id: dataViewId, ...rest }: OptionsListControlState) => ({
      state: { ...rest, dataViewRefName: 'optionsListDataView' },
      references: [{ name: 'optionsListDataView', type: 'index-pattern', id: dataViewId }],
    }),
    transformOut: (
      { dataViewRefName, ...rest }: StoredOptionsListControlState,
      _panelReferences?: SavedObjectReference[],
      containerReferences?: SavedObjectReference[]
    ) => ({
      ...rest,
      data_view_id: findReference(containerReferences, dataViewRefName) ?? '',
    }),
  }),
});

const storedDashboard: {
  attributes: DashboardSavedObjectAttributes;
  references: SavedObjectReference[];
} = {
  attributes: {
    title: 'Web traffic',
    description: 'Requests by host',
    timeRestore: false,
    optionsJSON: JSON.stringify({
      autoApplyFilters: true,
      hidePanelTitles: false,
      hidePanelBorders: false,
      useMargins: true,
      syncColors: false,
      syncCursor: true,
      syncTooltips: false,
    }),
    panelsJSON: JSON.stringify([
      {
        type: BY_REFERENCE_PANEL,
        panelIndex: 'panel-1',
        gridData: { x: 0, y: 0, w: 24, h: 15, i: 'panel-1' },
        embeddableConfig: { title: 'Requests', savedObjectRefName: 'savedObjectRef' },
      },
    ]),
    pinned_panels: {
      panels: {
        'control-1': {
          order: 0,
          type: OPTIONS_LIST_CONTROL,
          width: 'medium',
          grow: false,
          config: {
            dataViewRefName: 'control-1:optionsListDataView',
            field_name: 'host.name',
            values_source: 'field',
            exclude: false,
            exists_selected: false,
            ignore_validations: false,
            run_past_timeout: false,
            search_technique: 'wildcard',
            selected_options: [],
            single_select: false,
            sort: { by: '_count', direction: 'desc' },
            use_global_filters: true,
          },
        },
      },
    },
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify({
        filter: [
          {
            meta: {
              key: 'host.name',
              field: 'host.name',
              type: 'exists',
              indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
            },
            query: { exists: { field: 'host.name' } },
          },
        ],
      }),
    },
  },
  references: [
    { type: 'tag', id: 'tag-web', name: 'tag-ref-tag-web' },
    { type: 'lens', id: 'lens-requests', name: 'panel-1:savedObjectRef' },
    { type: 'index-pattern', id: 'logs', name: 'control-1:optionsListDataView' },
    {
      type: 'index-pattern',
      id: 'logs',
      name: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
    },
  ],
};

describe('dashboard API body entry', () => {
  beforeAll(() => {
    setKibanaServices(
      coreMock.createStart(),
      {
        embeddable: {
          ...createEmbeddableStartMock(),
          getAllEmbeddableSchemas: () => ({
            [BY_REFERENCE_PANEL]: { schema: byReferencePanelSchema, title: 'By-reference panel' },
          }),
        },
        taskManager: taskManagerMock.createStart(),
        savedObjectsManagement: savedObjectsManagementPluginMock.createStartContract(),
      },
      coreMock.createPluginInitializerContext().logger.get()
    );
  });

  it('round-trips a dashboard with a library panel, a filter, a pinned control and a tag', () => {
    const body = expectApiBodyEntryRoundTrip(createDashboardApiBodyEntry(), storedDashboard);

    expect(body).toMatchObject({
      title: 'Web traffic',
      tags: ['tag-web'],
      panels: [{ type: BY_REFERENCE_PANEL, config: { ref_id: 'lens-requests' } }],
      pinned_panels: [{ type: OPTIONS_LIST_CONTROL, config: { data_view_id: 'logs' } }],
      filters: [{ data_view_id: 'logs' }],
    });
  });

  it('produces the PUT body without access control or other metadata', () => {
    const savedObject: SavedObject<DashboardSavedObjectAttributes> = {
      ...storedDashboard,
      id: 'web-traffic',
      type: 'dashboard',
      updated_at: '2026-11-18T00:00:00.000Z',
      accessControl: { accessMode: 'write_restricted', owner: 'u_1' },
    };

    const { body } = createDashboardApiBodyEntry().toApi(savedObject);

    expect(body).not.toHaveProperty('access_control');
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('meta');
  });

  it('does not store access control from the body as an attribute', () => {
    const entry = createDashboardApiBodyEntry();
    const { body } = entry.toApi(storedDashboard);

    const { attributes } = entry.toStored({
      ...body,
      access_control: { access_mode: 'write_restricted' },
    });

    expect(attributes).not.toHaveProperty('access_control');
  });
});
