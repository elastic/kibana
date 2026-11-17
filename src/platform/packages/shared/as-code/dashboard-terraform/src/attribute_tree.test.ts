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
import type { AttributeTreeAttribute, AttributeTreeGroup } from './attribute_tree';
import { buildAttributeTree } from './attribute_tree';
import type { OasDocument } from './oas_model';

const publishedOas: OasDocument = parse(
  readFileSync(join(REPO_ROOT, 'oas_docs/output/kibana.yaml'), 'utf8')
);
const tree = buildAttributeTree(publishedOas);

// Panels inside sections repeat `panels[]` exactly (checked below), so the snapshot leaves that copy out.
const SECTION_PANELS = 'sections[].panels[]';
const notInSectionPanels = (path: string) => !path.startsWith(SECTION_PANELS);
const describeAttribute = ({ path, kind, element, mode }: AttributeTreeAttribute) =>
  `${path} ${element ? `${kind}<${element}>` : kind} ${mode}`;
const describeGroup = ({ kind, members, discriminator }: AttributeTreeGroup) =>
  `${kind}${discriminator ? ` by ${discriminator.path}` : ''}: ${members.join(' | ')}`;

describe('attribute tree of the dashboard resource', () => {
  it('matches the checked-in snapshot', () => {
    expect({
      attributes: tree.attributes
        .filter(({ path }) => notInSectionPanels(path))
        .map(describeAttribute),
      groups: tree.groups
        .filter(({ members }) => members.every(notInSectionPanels))
        .map(describeGroup),
    }).toMatchSnapshot();
  });

  it('gives panels inside sections the same attributes and variant groups as panels[]', () => {
    const fromSections = (path: string) => path.slice('sections[].'.length);
    const sectionAttributes = tree.attributes
      .filter(({ path }) => path.startsWith(SECTION_PANELS))
      .map((attribute) => describeAttribute({ ...attribute, path: fromSections(attribute.path) }));
    const sectionGroups = tree.groups
      .filter(({ members }) => members.every((member) => member.startsWith(SECTION_PANELS)))
      .map(({ members, discriminator, ...group }) =>
        describeGroup({
          ...group,
          members: members.map(fromSections),
          ...(discriminator
            ? { discriminator: { ...discriminator, path: fromSections(discriminator.path) } }
            : {}),
        })
      );
    const panelAttributes = tree.attributes
      .filter(({ path }) => path.startsWith('panels[]'))
      .map(describeAttribute);
    const panelGroups = tree.groups
      .filter(({ members }) => members.every((member) => member.startsWith('panels[]')))
      .map(describeGroup);
    expect(sectionAttributes).toEqual(panelAttributes);
    expect(sectionGroups).toEqual(panelGroups);
  });

  it('maps the by-value and by-reference variants of the markdown panel', () => {
    const paths = tree.attributes.map(({ path }) => path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'panels[].markdown_config.by_value',
        'panels[].markdown_config.by_reference',
      ])
    );
    expect(paths).not.toContain('panels[].markdown_config_json');
  });

  it('keeps sections out of the panels, as the provider models them', () => {
    const paths = tree.attributes.map(({ path }) => path);
    expect(paths).toContain('sections[].panels[].markdown_config.by_value');
    expect(paths).not.toContain('panels[].panels[]');
  });
});

describe('published OpenAPI document', () => {
  const collectKeys = (node: unknown, found: Set<string>): void => {
    if (Array.isArray(node)) return node.forEach((child) => collectKeys(child, found));
    if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith('x-tf')) found.add(key);
        collectKeys(child, found);
      }
    }
  };

  // A hand-written, misspelled key would compile (`.meta()` accepts any key) and silently do nothing.
  it('carries only the known mapping keys', () => {
    const found = new Set<string>();
    collectKeys(publishedOas.components.schemas, found);
    expect([...found].sort()).toEqual([
      'x-tf-flatten',
      'x-tf-json-leaf',
      'x-tf-omit',
      'x-tf-ref',
      'x-tf-union',
      'x-tf-union-override',
      'x-tf-unwrap',
      'x-tf-variant',
    ]);
  });

  // Data view IDs sit in shared definitions; each must carry the reference so every use of a data view is linked.
  it('marks the dashboard tags and every shared data view ID as references', () => {
    const found: string[] = [];
    const collectRefs = (node: unknown, path: string): void => {
      if (!node || typeof node !== 'object') return;
      for (const [key, child] of Object.entries(node)) {
        if (key === 'x-tf-ref') {
          const { resource_type: resourceType } = child as { resource_type: string };
          found.push(`${path} -> ${resourceType}`);
        } else collectRefs(child, `${path}/${key}`);
      }
    };
    collectRefs(publishedOas.components.schemas, '');

    expect(found.sort()).toEqual([
      '/Kibana_HTTP_APIs_aiops_change_point_chart/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_aiops_log_rate_analysis/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_aiops_pattern_analysis/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_data_visualizer_field_stats/oneOf/0/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_kbn-as-code-filters-schema_asCodeConditionFilterSchema/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_kbn-as-code-filters-schema_asCodeDSLFilterSchema/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_kbn-as-code-filters-schema_asCodeGroupFilterSchema/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_kbn-as-code-filters-schema_asCodeSpatialFilterSchema/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_kbn-controls-schemas-options-list-dsl-control-schema-field/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_kbn-controls-schemas-range-slider-control-schema-field/properties/data_view_id -> elasticstack_kibana_data_view',
      '/Kibana_HTTP_APIs_kbn-dashboard-data/properties/tags -> elasticstack_kibana_tag',
      '/Kibana_HTTP_APIs_kbn-data-view-reference-schema/properties/ref_id -> elasticstack_kibana_data_view',
    ]);
  });
});
