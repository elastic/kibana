/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TfUnionMeta } from '@kbn/zod';
import type { OasDocument, Prop, TNode } from './oas_model';
import { compileDashboardRoot } from './oas_model';

export type AttributeKind = 'string' | 'number' | 'bool' | 'object' | 'list' | 'json-string';

export interface AttributeTreeAttribute {
  path: string;
  kind: AttributeKind;
  element?: AttributeKind;
  mode: 'required' | 'optional' | 'computed' | 'optional_computed';
}

export interface AttributeTreeGroup {
  kind: NonNullable<TfUnionMeta['exclusivity']>;
  members: string[];
  discriminator?: { path: string; values: Record<string, readonly string[]> };
}

export interface AttributeTree {
  format: 'attribute-tree/v1';
  resource: 'elasticstack_kibana_dashboard';
  attributes: AttributeTreeAttribute[];
  groups: AttributeTreeGroup[];
}

const kindOf = (n: TNode): { kind: AttributeKind; element?: AttributeKind } => {
  switch (n.k) {
    case 'prim':
      return { kind: n.type };
    case 'json':
      return n.attribute ? { kind: 'object' } : { kind: 'json-string' };
    case 'list':
      return { kind: 'list', element: kindOf(n.items).kind };
    default:
      return { kind: 'object' };
  }
};

/**
 * Describes the Terraform attributes the mapping produces for the dashboard resource, from the published OpenAPI
 * document: each attribute's path and kind, and the groups of variant keys of which a single one may be set.
 */
export const buildAttributeTree = (doc: OasDocument): AttributeTree => {
  const attributes: AttributeTreeAttribute[] = [];
  const groups: AttributeTreeGroup[] = [];

  const emitProp = (prop: Prop, base: string): void => {
    if (prop.flatten) return emitFields(prop.node, base);
    const path = base ? `${base}.${prop.tfName}` : prop.tfName;
    // Required in the API is required in Terraform. Computed-ness is not derivable from the OpenAPI document.
    attributes.push({ path, ...kindOf(prop.node), mode: prop.required ? 'required' : 'optional' });
    emitFields(prop.node, path);
  };

  const emitFields = (n: TNode, base: string): void => {
    const p = (name: string) => (base ? `${base}.${name}` : name);
    if (n.k === 'json' && n.attribute) {
      attributes.push({ path: p(n.attribute), kind: 'json-string', mode: 'required' });
    } else if (n.k === 'object') {
      for (const prop of n.props) emitProp(prop, base);
    } else if (n.k === 'list') {
      emitFields(n.items, `${base}[]`);
    } else if (n.k === 'keyed') {
      for (const prop of n.outside) emitProp(prop, base);
      if (n.discOutside && n.disc)
        attributes.push({ path: p(n.disc), kind: 'string', mode: 'required' });
      const members: string[] = [];
      const values: Record<string, readonly string[]> = {};
      for (const v of n.variants) {
        const variantKind = kindOf(v.content).kind === 'json-string' ? 'json-string' : 'object';
        attributes.push({ path: p(v.key), kind: variantKind, mode: 'optional' });
        emitFields(v.content, p(v.key));
        members.push(p(v.key));
        values[p(v.key)] = v.values;
      }
      if (n.m.extra_json_variant) {
        const key = p(n.m.extra_json_variant.key);
        attributes.push({ path: key, kind: 'json-string', mode: 'optional' });
        members.push(key);
        values[key] = n.m.extra_json_variant.values;
      }
      groups.push({
        kind: n.m.exclusivity ?? 'exactly_one_of',
        members,
        ...(n.discOutside && n.disc ? { discriminator: { path: p(n.disc), values } } : {}),
      });
    }
  };

  const { root } = compileDashboardRoot(doc);
  emitFields(root, '');

  // Resource identity is provider plumbing, not part of the API.
  attributes.push({ path: 'id', kind: 'string', mode: 'computed' });
  attributes.push({ path: 'dashboard_id', kind: 'string', mode: 'optional_computed' });
  attributes.push({ path: 'space_id', kind: 'string', mode: 'optional_computed' });

  attributes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const g of groups) g.members.sort();
  groups.sort((a, b) =>
    a.members[0] < b.members[0] ? -1 : a.members[0] > b.members[0] ? 1 : a.kind < b.kind ? -1 : 1
  );

  return {
    format: 'attribute-tree/v1',
    resource: 'elasticstack_kibana_dashboard',
    attributes,
    groups,
  };
};
