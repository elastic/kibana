/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyedNode, OasDocument, TNode, Variant } from './oas_model';
import { compileDashboardRoot } from './oas_model';

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface SkippedPanel {
  /** API path of the panel, e.g. `panels[2]` or `panels[0].panels[1]` inside a section. */
  path: string;
  type?: string;
  reason: string;
}

export interface DashboardConversion {
  /** The body of the `elasticstack_kibana_dashboard` resource, in Terraform JSON syntax. */
  body: JsonObject;
  /** API paths of the fields the resource has no attribute for. */
  droppedFields: string[];
  /** Panels that could not be converted and are left out of `body`. */
  skippedPanels: SkippedPanel[];
}

/** The dashboard itself (not one of its panels) cannot be converted. */
export class DashboardConversionError extends Error {}

export type DashboardConverter = (dashboard: JsonObject) => DashboardConversion;

const isObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const preview = (value: JsonValue) => JSON.stringify(value).slice(0, 120);

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const expectObject = (value: JsonValue, path: string): JsonObject => {
  if (!isObject(value)) throw new Error(`${path}: expected an object, got ${preview(value)}`);
  return value;
};

const childPath = (path: string, key: string) => (path ? `${path}.${key}` : key);

const recognize = (node: KeyedNode, value: JsonObject, path: string): Variant | undefined => {
  if (node.m.structural) {
    return node.variants.find(({ match }) =>
      !match ? false : 'present' in match ? match.present in value : !(match.absent in value)
    );
  }
  const discriminatorValue = value[node.disc ?? ''] ?? node.m.default_value;
  if (typeof discriminatorValue !== 'string') return undefined;
  return node.variants.find(({ values }) => values.includes(discriminatorValue));
};

const convertValue = (
  node: TNode,
  value: JsonValue,
  path: string,
  dropped: string[]
): JsonValue => {
  switch (node.k) {
    case 'prim':
      return value;
    case 'json': {
      const json = JSON.stringify(value);
      return node.attribute ? { [node.attribute]: json } : json;
    }
    case 'list':
      if (!Array.isArray(value)) throw new Error(`${path}: expected a list, got ${preview(value)}`);
      return value.map((item, i) => convertValue(node.items, item, `${path}[${i}]`, dropped));
    case 'object': {
      const out: JsonObject = {};
      for (const [key, child] of Object.entries(expectObject(value, path))) {
        const prop = node.props.find(({ apiName }) => apiName === key);
        if (!prop) {
          dropped.push(childPath(path, key));
          continue;
        }
        const converted = convertValue(prop.node, child, childPath(path, key), dropped);
        if (prop.flatten && isObject(converted)) Object.assign(out, converted);
        else out[prop.tfName] = converted;
      }
      return out;
    }
    case 'keyed':
      return convertKeyed(node, value, path, dropped);
  }
};

const convertKeyed = (
  node: KeyedNode,
  apiValue: JsonValue,
  path: string,
  dropped: string[]
): JsonObject => {
  const value = expectObject(apiValue, path);
  const { m, disc, discOutside, outside } = node;
  const out: JsonObject = {};
  const rest: JsonObject = { ...value };
  for (const prop of outside) {
    const child = value[prop.apiName];
    if (child !== undefined) {
      out[prop.tfName] = convertValue(prop.node, child, childPath(path, prop.apiName), dropped);
    }
    delete rest[prop.apiName];
  }
  const variant = recognize(node, value, path);
  if (disc && discOutside && value[disc] !== undefined) out[disc] = value[disc];
  if (disc && !variant?.keepDiscriminator) delete rest[disc];

  const contentPath = m.content ? childPath(path, m.content) : path;
  let content: JsonValue = rest;
  if (m.content) {
    content = value[m.content] ?? {};
    for (const key of Object.keys(rest)) if (key !== m.content) dropped.push(childPath(path, key));
  }

  const discriminatorValue = disc ? value[disc] : undefined;
  if (
    !variant &&
    m.extra_json_variant &&
    typeof discriminatorValue === 'string' &&
    m.extra_json_variant.values.includes(discriminatorValue)
  ) {
    out[m.extra_json_variant.key] = JSON.stringify(content);
    return out;
  }
  if (!variant) {
    throw new Error(`${path}: no Terraform variant for ${preview(value)}`);
  }
  out[variant.key] = convertValue(variant.content, content, contentPath, dropped);
  return out;
};

// Strings in Terraform JSON syntax are templates: `${` and `%{` start an interpolation or a directive, `$${` and
// `%%{` are their literal forms. Replacer functions, because `$$` in a replacement string is a single `$`.
const escapeTemplate = (text: string): string =>
  text.replace(/\$\{/g, () => '$${').replace(/%\{/g, () => '%%{');

const escapeStrings = (value: JsonValue): JsonValue => {
  if (typeof value === 'string') return escapeTemplate(value);
  if (Array.isArray(value)) return value.map(escapeStrings);
  return isObject(value) ? escapeObject(value) : value;
};

const escapeObject = (value: JsonObject): JsonObject =>
  Object.fromEntries(Object.entries(value).map(([key, v]) => [key, escapeStrings(v)]));

const listItems = (node: TNode | undefined, what: string): TNode => {
  if (node?.k !== 'list') throw new Error(`The dashboard model has no list of ${what}`);
  return node.items;
};

const propNode = (node: TNode, name: string): TNode | undefined =>
  node.k === 'object' ? node.props.find(({ apiName }) => apiName === name)?.node : undefined;

/** Compiles the dashboard schemas once; the converter skips and reports each panel it cannot convert. */
export const createDashboardConverter = (doc: OasDocument): DashboardConverter => {
  const { root } = compileDashboardRoot(doc);
  const panelNode = listItems(propNode(root, 'panels'), 'panels');
  const pinnedPanelNode = listItems(propNode(root, 'pinned_panels'), 'pinned panels');
  const sectionNode = listItems(propNode(root, 'sections'), 'sections');
  const sectionPanelNode = listItems(propNode(sectionNode, 'panels'), 'section panels');

  return (dashboard) => {
    const droppedFields: string[] = [];
    const skippedPanels: SkippedPanel[] = [];
    const { panels = [], pinned_panels: pinnedPanels = [], ...envelope } = dashboard;

    const convertPanel = (node: TNode, panel: JsonValue, path: string): JsonValue[] => {
      const dropped: string[] = [];
      try {
        const converted = convertValue(node, panel, path, dropped);
        droppedFields.push(...dropped);
        return [converted];
      } catch (e) {
        const type = isObject(panel) && typeof panel.type === 'string' ? panel.type : undefined;
        skippedPanels.push({ path, type, reason: messageOf(e) });
        return [];
      }
    };
    const convertPanels = (node: TNode, list: JsonValue, path: string): JsonValue[] => {
      if (!Array.isArray(list)) throw new DashboardConversionError(`${path}: expected a list`);
      return list.flatMap((panel, i) => convertPanel(node, panel, `${path}[${i}]`));
    };

    // Outside panels, a value the resource cannot hold fails the whole dashboard.
    const convertPart = (node: TNode, value: JsonObject, path: string): JsonObject => {
      try {
        return expectObject(convertValue(node, value, path, droppedFields), path);
      } catch (e) {
        throw new DashboardConversionError(messageOf(e));
      }
    };

    const body = convertPart(root, envelope, '');
    if (!Array.isArray(panels)) throw new DashboardConversionError('panels: expected a list');

    // Sections are a documented special case: the API interleaves them with panels, the resource keeps two lists.
    const tfPanels: JsonValue[] = [];
    const tfSections: JsonValue[] = [];
    panels.forEach((item, i) => {
      const path = `panels[${i}]`;
      if (!isObject(item) || 'type' in item || !Array.isArray(item.panels)) {
        tfPanels.push(...convertPanel(panelNode, item, path));
        return;
      }
      const { panels: sectionPanels, ...section } = item;
      const tfSection = convertPart(sectionNode, section, path);
      const converted = convertPanels(sectionPanelNode, sectionPanels, `${path}.panels`);
      tfSections.push(converted.length ? { ...tfSection, panels: converted } : tfSection);
    });
    const tfPinnedPanels = convertPanels(pinnedPanelNode, pinnedPanels, 'pinned_panels');

    if (tfPanels.length) body.panels = tfPanels;
    if (tfSections.length) body.sections = tfSections;
    if (tfPinnedPanels.length) body.pinned_panels = tfPinnedPanels;

    // Everything in the body is user content; references generated later must not go through this.
    return { body: escapeObject(body), droppedFields, skippedPanels };
  };
};
