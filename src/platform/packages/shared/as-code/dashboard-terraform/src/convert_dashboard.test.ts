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
import type { JsonObject, JsonValue } from './convert_dashboard';
import { createDashboardConverter } from './convert_dashboard';

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
