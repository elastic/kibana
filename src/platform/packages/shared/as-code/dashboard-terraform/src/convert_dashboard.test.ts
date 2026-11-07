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
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import type { OasDocument } from './oas_model';
import type { JsonObject, JsonValue } from '@kbn/utility-types';
import { createDashboardConverter, linkReferences } from './convert_dashboard';

const publishedOas: OasDocument = parse(
  readFileSync(join(REPO_ROOT, 'oas_docs/output/kibana.yaml'), 'utf8')
);
const convert = createDashboardConverter(publishedOas);

const fixture = (name: string): JsonObject =>
  JSON.parse(readFileSync(join(__dirname, '__fixtures__', `${name}.json`), 'utf8'));

/** The value at a path of object keys and list indexes, or undefined when the path is absent. */
const at = (value: JsonValue | undefined, ...path: Array<string | number>): JsonValue | undefined =>
  path.reduce<JsonValue | undefined>((node, step) => {
    if (Array.isArray(node) && typeof step === 'number') return node[step];
    if (node && typeof node === 'object' && !Array.isArray(node) && typeof step === 'string') {
      return node[step];
    }
    return undefined;
  }, value);

const keysAt = (value: JsonValue, ...path: Array<string | number>): string[] => {
  const node = at(value, ...path);
  return node && typeof node === 'object' && !Array.isArray(node) ? Object.keys(node) : [];
};

describe('createDashboardConverter', () => {
  it('puts each panel under the variant key of its type', () => {
    const { body, droppedFields, skippedPanels } = convert(fixture('oas_create_simple'));

    expect(body.title).toBe('Web logs overview');
    expect([0, 1, 2, 3].map((i) => keysAt(body, 'panels', i).sort())).toEqual([
      ['grid', 'markdown_config', 'type'],
      ['grid', 'type', 'vis_config'],
      ['grid', 'type', 'vis_config'],
      ['grid', 'type', 'vis_config'],
    ]);
    expect(keysAt(body, 'panels', 1, 'vis_config', 'by_value')).toEqual(['metric_chart_config']);
    expect(keysAt(body, 'panels', 3, 'vis_config', 'by_value')).toEqual(['xy_chart_config']);
    expect(droppedFields).toEqual([]);
    expect(skippedPanels).toEqual([]);
  });

  // Variant-key paths from the attribute tree checked against the provider's schema (spike 0 golden).
  it.each([
    ['image_file_src', ['panels', 0, 'image_config', 'src', 'file', 'file_id']],
    ['image_url_src_drilldowns', ['panels', 0, 'image_config', 'src', 'url', 'url']],
    [
      'image_url_src_drilldowns',
      ['panels', 0, 'image_config', 'drilldowns', 0, 'dashboard_drilldown', 'dashboard_id'],
    ],
    ['image_url_src_drilldowns', ['panels', 0, 'image_config', 'drilldowns', 1, 'url_drilldown']],
    ['vis_by_reference', ['panels', 0, 'vis_config', 'by_reference', 'ref_id']],
    ['vis_metric_esql', ['panels', 1, 'vis_config', 'by_value', 'metric_chart_config']],
    ['root_filters', ['filters', 4, 'filter_json']],
  ])('converts every panel of %s, with a value at %j', (name, path) => {
    const { body, droppedFields, skippedPanels } = convert(fixture(name));

    expect(at(body, ...path)).toBeDefined();
    expect(droppedFields).toEqual([]);
    expect(skippedPanels).toEqual([]);
  });

  it('keeps a by-reference panel by reference, with its library ID as written', () => {
    const { body, references } = convert(fixture('vis_by_reference'));

    expect(keysAt(body, 'panels', 0, 'vis_config')).toEqual(['by_reference']);
    expect(at(body, 'panels', 0, 'vis_config', 'by_reference', 'ref_id')).toBe('lensRef');
    expect(references).toEqual([]);
  });

  it('moves sections out of panels into sections, keeping their own panels', () => {
    const { body, droppedFields } = convert(fixture('oas_sections_and_controls'));

    expect(body.panels).toBeUndefined();
    expect(at(body, 'sections', 0)).toMatchObject({
      title: 'Key metrics',
      collapsed: false,
      grid: { y: 0 },
    });
    expect(keysAt(body, 'sections', 0, 'panels', 0, 'vis_config', 'by_value')).toEqual([
      'metric_chart_config',
    ]);
    expect(at(body, 'sections', 1, 'title')).toBe('Traffic trends');
    expect(keysAt(body, 'sections', 1, 'panels', 1, 'vis_config', 'by_value')).toEqual([
      'xy_chart_config',
    ]);
    expect(droppedFields).toEqual([]);
  });

  it('escapes Terraform template sequences in every string, JSON strings included', () => {
    const { body } = convert({
      title: 'Costs ${var.env}',
      filters: [
        { type: 'condition', condition: { field: 'tag', operator: 'is', value: '%{if x}' } },
      ],
      panels: [
        {
          type: 'markdown',
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: { content: 'Total: ${price} and $${already} %{ endif }' },
        },
      ],
    });

    expect(body.title).toBe('Costs $${var.env}');
    expect(at(body, 'panels', 0, 'markdown_config', 'by_value', 'content')).toBe(
      'Total: $${price} and $$${already} %%{ endif }'
    );
    expect(at(body, 'filters', 0, 'filter_json')).toBe(
      '{"type":"condition","condition":{"field":"tag","operator":"is","value":"%%{if x}"}}'
    );
  });

  it('reports fields with no Terraform attribute by API path and skips panels it cannot convert', () => {
    const markdown = (content: string, extra = {}) => ({
      type: 'markdown',
      grid: { x: 0, y: 0, w: 24, h: 15 },
      config: { content, ...extra },
    });
    const { body, droppedFields, skippedPanels } = convert({
      title: 'Partly exportable',
      not_an_attribute: true,
      panels: [
        markdown('first', { not_a_markdown_attribute: 1 }),
        { type: 'not_a_panel_type', grid: { x: 0, y: 15, w: 24, h: 15 }, config: {} },
        {
          title: 'Section',
          grid: { y: 30 },
          panels: [{ type: 'markdown', grid: { x: 0, y: 0, w: 1, h: 1 }, config: 'not an object' }],
        },
        markdown('last'),
      ],
    });

    expect(droppedFields).toEqual([
      'not_an_attribute',
      'panels[0].config.not_a_markdown_attribute',
    ]);
    expect(skippedPanels).toEqual([
      { path: 'panels[1]', type: 'not_a_panel_type', reason: expect.any(String) },
      { path: 'panels[2].panels[0]', type: 'markdown', reason: expect.any(String) },
    ]);
    expect(at(body, 'panels', 0, 'markdown_config', 'by_value', 'content')).toBe('first');
    expect(at(body, 'panels', 1, 'markdown_config', 'by_value', 'content')).toBe('last');
    expect(at(body, 'panels', 2)).toBeUndefined();
    expect(at(body, 'sections', 0)).toEqual({ title: 'Section', grid: { y: 30 } });
  });

  it('reports a panel with dropped fields as partial, even when all of them were dropped', () => {
    const { droppedFields, partialPanels } = convert({
      title: 'Partial panels',
      panels: [
        {
          type: 'markdown',
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: { title: 'Notes', content: 'kept', not_an_attribute: 1 },
        },
        {
          type: 'image',
          grid: { x: 0, y: 15, w: 24, h: 15 },
          config: { not_an_attribute: 1, nor_this: 2 },
        },
        { type: 'markdown', grid: { x: 0, y: 30, w: 24, h: 15 }, config: { content: 'clean' } },
      ],
    });

    expect(partialPanels).toEqual([
      {
        path: 'panels[0]',
        type: 'markdown',
        title: 'Notes',
        droppedFields: ['panels[0].config.not_an_attribute'],
      },
      {
        path: 'panels[1]',
        type: 'image',
        droppedFields: ['panels[1].config.not_an_attribute', 'panels[1].config.nor_this'],
      },
    ]);
    expect(droppedFields).toEqual([
      'panels[0].config.not_an_attribute',
      'panels[1].config.not_an_attribute',
      'panels[1].config.nor_this',
    ]);
  });

  it('exports a panel it cannot type as a JSON string when the resource allows one for its type', () => {
    const config = { title: 'Old chart', type: 'not_a_chart_type', costs: '${price}' };
    const { body, jsonPanels, skippedPanels, droppedFields } = convert({
      title: 'JSON string panels',
      panels: [{ type: 'vis', grid: { x: 0, y: 0, w: 24, h: 15 }, config }],
    });

    expect(at(body, 'panels', 0)).toEqual({
      type: 'vis',
      grid: { x: 0, y: 0, w: 24, h: 15 },
      config_json: '{"title":"Old chart","type":"not_a_chart_type","costs":"$${price}"}',
    });
    expect(jsonPanels).toEqual([
      { path: 'panels[0]', type: 'vis', title: 'Old chart', reason: expect.any(String) },
    ]);
    expect(skippedPanels).toEqual([]);
    expect(droppedFields).toEqual([]);
  });

  it('writes XY axis grid and ticks as booleans, and an ES|QL field statistics query as a string', () => {
    const { body, droppedFields, skippedPanels } = convert({
      title: 'Unwrapped values',
      panels: [
        {
          type: 'vis',
          grid: { x: 0, y: 0, w: 24, h: 10 },
          config: {
            type: 'xy',
            layers: [
              {
                type: 'line',
                data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT() BY host' },
                x: { column: 'host' },
                y: [{ column: 'count' }],
              },
            ],
            axis: {
              x: { grid: { visible: false }, ticks: { visible: true } },
              y: { grid: { visible: true }, ticks: { visible: false } },
              y2: { grid: { visible: true }, ticks: { visible: true } },
            },
          },
        },
        {
          type: 'field_stats_table',
          grid: { x: 0, y: 10, w: 24, h: 10 },
          config: { view_type: 'esql', query: { esql: 'FROM logs | LIMIT 10' } },
        },
      ],
    });

    expect(skippedPanels).toEqual([]);
    expect(droppedFields).toEqual([]);
    expect(at(body, 'panels', 0, 'vis_config', 'by_value', 'xy_chart_config', 'axis')).toEqual({
      x: { grid: false, ticks: true },
      y: { grid: true, ticks: false },
      y2: { grid: true, ticks: true },
    });
    expect(at(body, 'panels', 1, 'field_stats_table_config', 'by_esql', 'query')).toBe(
      'FROM logs | LIMIT 10'
    );
  });

  it('writes each reference-line threshold whole as the value_json of an object', () => {
    const staticThreshold = {
      operation: 'static_value',
      value: 42,
      axis: 'y2',
      color: { type: 'static', color: '#E7664C' },
      text: { visible: true },
      fill: 'above',
    };
    const countThreshold = { operation: 'count', empty_as_null: false };
    const { body, droppedFields, skippedPanels } = convert({
      title: 'Reference lines',
      panels: [
        {
          type: 'vis',
          grid: { x: 0, y: 0, w: 24, h: 10 },
          config: {
            type: 'xy',
            layers: [
              {
                type: 'line',
                data_source: { type: 'data_view_spec', index_pattern: 'logs-*' },
                y: [{ operation: 'count' }],
              },
              {
                type: 'reference_lines',
                data_source: { type: 'data_view_spec', index_pattern: 'logs-*' },
                thresholds: [staticThreshold, countThreshold],
              },
            ],
          },
        },
      ],
    });

    expect(skippedPanels).toEqual([]);
    expect(droppedFields).toEqual([]);
    const chart = at(body, 'panels', 0, 'vis_config', 'by_value', 'xy_chart_config');
    expect(at(chart, 'layers', 1, 'reference_line_layer', 'thresholds')).toEqual([
      { value_json: JSON.stringify(staticThreshold) },
      { value_json: JSON.stringify(countThreshold) },
    ]);
  });

  it.each([
    ['pie', 'pie_chart_config'],
    ['waffle', 'waffle_config'],
  ])(
    'writes each %s metric and breakdown whole as the config_json of an object',
    (type, configKey) => {
      const metric = { operation: 'count', empty_as_null: false };
      const groupBy = { operation: 'terms', fields: ['host.name'], limit: 5 };
      const { body, droppedFields, skippedPanels } = convert({
        title: 'Partition charts',
        panels: [
          {
            type: 'vis',
            grid: { x: 0, y: 0, w: 24, h: 10 },
            config: {
              type,
              data_source: { type: 'data_view_spec', index_pattern: 'logs-*' },
              metrics: [metric],
              group_by: [groupBy],
            },
          },
        ],
      });

      expect(skippedPanels).toEqual([]);
      expect(droppedFields).toEqual([]);
      const chart = at(body, 'panels', 0, 'vis_config', 'by_value', configKey);
      expect(at(chart, 'metrics')).toEqual([{ config_json: JSON.stringify(metric) }]);
      expect(at(chart, 'group_by')).toEqual([{ config_json: JSON.stringify(groupBy) }]);
    }
  );

  it('names skipped panels by title, and keeps converting the rest', () => {
    const { body, skippedPanels } = convert({
      title: 'With a panel the provider does not support',
      panels: [
        {
          type: 'legacy_tsvb',
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: { title: 'Requests over time', params: { type: 'timeseries' } },
        },
        { type: 'markdown', grid: { x: 0, y: 15, w: 24, h: 15 }, config: { content: 'kept' } },
      ],
    });

    expect(skippedPanels).toEqual([
      {
        path: 'panels[0]',
        type: 'legacy_tsvb',
        title: 'Requests over time',
        reason: expect.any(String),
      },
    ]);
    expect(at(body, 'panels', 0, 'markdown_config', 'by_value', 'content')).toBe('kept');
  });

  describe('tags', () => {
    const tag = (id: string, name: string, extra: JsonObject = {}) => ({
      resourceType: 'elasticstack_kibana_tag',
      id,
      name,
      attributes: { name, color: '#772299', description: '', ...extra },
    });

    it('keeps tag IDs in the body as escaped text and reports each one as a reference to a tag resource', () => {
      const { body, references } = convert({ title: 'Tagged', tags: ['tag-1', 'odd-${id}'] });

      expect(body.tags).toEqual(['tag-1', 'odd-$${id}']);
      expect(references).toEqual([
        {
          path: ['tags', 0],
          resourceType: 'elasticstack_kibana_tag',
          idAttribute: 'tag_id',
          id: 'tag-1',
        },
        {
          path: ['tags', 1],
          resourceType: 'elasticstack_kibana_tag',
          idAttribute: 'tag_id',
          id: 'odd-${id}',
        },
      ]);
    });

    it('points the tags at new tag resources that pin no ID; references are not escaped, tag text is', () => {
      const conversion = convert({ title: 'Costs ${env}', tags: ['tag-1', 'tag-2'] });
      const { body, resources } = linkReferences(conversion, [
        tag('tag-1', 'Production', { description: 'Owned by ${team}' }),
        tag('tag-2', '100%{ok}', { color: '#000000' }),
      ]);

      expect(body.title).toBe('Costs $${env}');
      expect(body.tags).toEqual([
        '${elasticstack_kibana_tag.production.tag_id}',
        '${elasticstack_kibana_tag._100_ok.tag_id}',
      ]);
      expect(resources).toEqual([
        {
          type: 'elasticstack_kibana_tag',
          name: 'production',
          id: 'tag-1',
          label: 'Production',
          body: { name: 'Production', color: '#772299', description: 'Owned by $${team}' },
        },
        {
          type: 'elasticstack_kibana_tag',
          name: '_100_ok',
          id: 'tag-2',
          label: '100%{ok}',
          body: { name: '100%%{ok}', color: '#000000', description: '' },
        },
      ]);
    });

    it('gives tags whose names make the same resource name distinct names', () => {
      const conversion = convert({ title: 'Tagged', tags: ['a', 'b', 'c'] });
      const { resources } = linkReferences(conversion, [
        tag('a', 'Team A'),
        tag('b', 'team-a'),
        tag('c', '!!!'),
      ]);

      expect(resources.map(({ name }) => name)).toEqual(['team_a', 'team_a_2', 'tag']);
    });

    it('leaves a tag it was not given as its literal ID', () => {
      const conversion = convert({ title: 'Tagged', tags: ['tag-1', 'missing-${x}'] });
      const { body, resources } = linkReferences(conversion, [tag('tag-1', 'Production')]);

      expect(body.tags).toEqual(['${elasticstack_kibana_tag.production.tag_id}', 'missing-$${x}']);
      expect(resources.map(({ id }) => id)).toEqual(['tag-1']);
    });

    it('links the readable tags of a dashboard with several, leaving the managed and unreadable ones literal', () => {
      // The route gives only the tags the user can read and Kibana does not manage.
      const conversion = convert(fixture('several_tags'));
      const { body, resources } = linkReferences(conversion, [
        tag('tag-production', 'Production'),
        tag('tag-team-a', 'Team A'),
      ]);

      expect(body.tags).toEqual([
        '${elasticstack_kibana_tag.production.tag_id}',
        '${elasticstack_kibana_tag.team_a.tag_id}',
        'fleet-managed-default',
        'tag-unreadable',
      ]);
      expect(resources.map(({ id, name }) => [id, name])).toEqual([
        ['tag-production', 'production'],
        ['tag-team-a', 'team_a'],
      ]);
    });
  });

  describe('data views', () => {
    const DATA_VIEW = 'elasticstack_kibana_data_view';
    const dataView = (id: string, name: string, title = 'logs-*') => ({
      resourceType: DATA_VIEW,
      id,
      name,
      attributes: { data_view: { title, name, time_field_name: '@timestamp' } },
    });
    const reference = '${elasticstack_kibana_data_view.web_logs.data_view.id}';
    const lensDataSource = ['panels', 0, 'vis_config', 'by_value', 'metric_chart_config'];
    const parsed = (value: JsonValue | undefined): JsonValue =>
      typeof value === 'string' ? JSON.parse(value) : null;

    it('points every use of a data view at one resource, inside JSON strings too', () => {
      const conversion = convert(fixture('data_views'));
      const { body, resources } = linkReferences(conversion, [dataView('logs-dv', 'Web logs')]);

      expect(conversion.unlinkableIds).toEqual([]);
      expect(at(parsed(at(body, ...lensDataSource, 'data_source_json')), 'ref_id')).toBe(reference);
      expect(at(parsed(at(body, 'filters', 0, 'filter_json')), 'data_view_id')).toBe(reference);
      expect(
        at(body, 'pinned_panels', 0, 'options_list_control_config', 'by_field', 'data_view_id')
      ).toBe(reference);
      expect(at(body, 'panels', 1, 'field_stats_table_config', 'by_dataview', 'data_view_id')).toBe(
        reference
      );
      expect(resources).toEqual([
        {
          type: DATA_VIEW,
          name: 'web_logs',
          id: 'logs-dv',
          label: 'Web logs',
          body: { data_view: { title: 'logs-*', name: 'Web logs', time_field_name: '@timestamp' } },
        },
      ]);
    });

    it('writes a reference inside a JSON string unescaped while user text in the same string stays escaped', () => {
      const { body } = linkReferences(convert(fixture('data_views')), [
        dataView('logs-dv', 'Web logs'),
      ]);
      const filterJson = at(body, 'filters', 0, 'filter_json');

      expect(filterJson).toContain(`"data_view_id":"${reference}"`);
      expect(filterJson).toContain('"value":"$${not_a_reference}"');
    });

    it('reports a data view inside a JSON string as a reference into that string', () => {
      const { references } = convert(fixture('data_views'));

      expect(references).toContainEqual({
        path: ['filters', 0, 'filter_json'],
        jsonPath: ['data_view_id'],
        resourceType: DATA_VIEW,
        idAttribute: 'data_view.id',
        id: 'logs-dv',
      });
      expect(references.filter(({ id }) => id === 'logs-dv')).toHaveLength(4);
    });

    it('keeps a data view literal everywhere when one of its uses cannot be linked', () => {
      const dashboard = fixture('data_views');
      const [lens] = dashboard.panels as JsonObject[];
      // The deprecated by-value Lens `references` carry data view IDs no annotation reaches.
      (lens.config as JsonObject).references = [
        { type: 'index-pattern', id: 'logs-dv', name: 'indexpattern-datasource-layer-1' },
      ];
      const conversion = convert(dashboard);
      const { body, resources } = linkReferences(conversion, [dataView('logs-dv', 'Web logs')]);

      expect(conversion.unlinkableIds).toEqual(['logs-dv']);
      expect(resources).toEqual([]);
      expect(JSON.stringify(body)).not.toContain('elasticstack_kibana_data_view');
      expect(at(parsed(at(body, ...lensDataSource, 'data_source_json')), 'ref_id')).toBe('logs-dv');
    });

    it('leaves a data view it was not given as its literal ID', () => {
      const { body, resources } = linkReferences(convert(fixture('data_views')), []);

      expect(resources).toEqual([]);
      expect(at(parsed(at(body, 'filters', 0, 'filter_json')), 'data_view_id')).toBe('logs-dv');
      expect(at(body, 'panels', 1, 'field_stats_table_config', 'by_dataview', 'data_view_id')).toBe(
        'logs-dv'
      );
    });

    it('names a data view resource `data_view` when its name yields no identifier', () => {
      const { title, pinned_panels: pinnedPanels } = fixture('data_views');
      const { resources } = linkReferences(convert({ title, pinned_panels: pinnedPanels }), [
        dataView('logs-dv', '***'),
      ]);

      expect(resources.map(({ name, label }) => [name, label])).toEqual([['data_view', '***']]);
    });
  });

  it('puts pinned panels under the variant key of their type and values source', () => {
    const { body: optionsList } = convert(fixture('oas_sections_and_controls'));
    expect(keysAt(optionsList, 'pinned_panels', 0).sort()).toEqual([
      'grow',
      'options_list_control_config',
      'type',
      'width',
    ]);
    expect(keysAt(optionsList, 'pinned_panels', 0, 'options_list_control_config')).toEqual([
      'by_field',
    ]);

    const { body: rangeSliders } = convert(fixture('pinned_range_slider'));
    expect(keysAt(rangeSliders, 'pinned_panels', 0, 'range_slider_control_config')).toEqual([
      'by_field',
    ]);
    expect(keysAt(rangeSliders, 'pinned_panels', 1, 'range_slider_control_config')).toEqual([
      'by_esql',
    ]);
  });
});
