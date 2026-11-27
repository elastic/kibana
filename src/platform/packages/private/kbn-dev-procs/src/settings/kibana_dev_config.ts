/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { isMap, isScalar, parse, parseDocument } from 'yaml';
import type { YAMLMap } from 'yaml';
import type { ConfigValue } from './format';

interface EntryStep {
  readonly map: YAMLMap;
  readonly key: string;
}

const hasKey = (map: YAMLMap, key: string): boolean =>
  map.items.some((pair) => isScalar(pair.key) && pair.key.value === key);

/**
 * Finds where a dotted setting lives in a YAML map, as Kibana reads it: one dotted key, nested maps, or a mix
 * like `xpack.fleet: { enabled: true }`. Returns the maps and keys from the root down to the setting.
 */
const findEntry = (map: YAMLMap, segments: readonly string[]): readonly EntryStep[] | undefined => {
  for (let length = segments.length; length >= 1; length--) {
    const key = segments.slice(0, length).join('.');
    if (!hasKey(map, key)) {
      continue;
    }
    if (length === segments.length) {
      return [{ map, key }];
    }
    const child = map.get(key, true);
    const rest = isMap(child) ? findEntry(child, segments.slice(length)) : undefined;
    if (rest) {
      return [{ map, key }, ...rest];
    }
  }
  return undefined;
};

/** Removes a key, keeping the comment above it, and removes parent maps that become empty. */
const removeEntry = (trail: readonly EntryStep[]): void => {
  for (let index = trail.length - 1; index >= 0; index--) {
    const { map, key } = trail[index];
    const position = map.items.findIndex((pair) => isScalar(pair.key) && pair.key.value === key);
    const [removed] = map.items.splice(position, 1);
    const next = map.items[position];
    if (
      removed &&
      isScalar(removed.key) &&
      removed.key.commentBefore &&
      next &&
      isScalar(next.key)
    ) {
      next.key.commentBefore = [removed.key.commentBefore, next.key.commentBefore]
        .filter(Boolean)
        .join('\n');
    }
    if (map.items.length > 0) {
      return;
    }
  }
};

/**
 * Sets a setting in a Kibana YAML config file, or removes it when `value` is undefined. Updates the existing entry
 * in place, wherever it is nested, and keeps the rest of the file and its comments.
 */
export const writeConfigSetting = (
  file: string,
  key: string,
  value: ConfigValue | undefined
): void => {
  const document = parseDocument(fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
  if (document.errors.length > 0) {
    throw new Error(`${file} is not valid YAML: ${document.errors[0].message}`);
  }
  const root = document.contents;
  if (root !== null && !isMap(root)) {
    throw new Error(`${file} does not hold a map of settings`);
  }
  const trail = root ? findEntry(root, key.split('.')) : undefined;
  if (value === undefined) {
    if (trail) {
      removeEntry(trail);
    }
  } else if (trail) {
    const { map, key: leafKey } = trail[trail.length - 1];
    map.set(leafKey, value);
  } else {
    document.set(key, value);
  }
  const isEmpty =
    isMap(document.contents) && document.contents.items.length === 0 && !document.commentBefore;
  // An empty map would be written as `{}`.
  fs.writeFileSync(file, isEmpty ? '' : String(document));
};

/**
 * Parses what the user typed for a setting of the given schema type, e.g. `false`, `5601` or `["a", "b"]`.
 * Strings are taken as typed; other values are read as YAML, like in kibana.yml.
 */
export const parseSettingInput = (input: string, type?: string): ConfigValue => {
  const text = input.trim();
  if (text === '') {
    throw new Error('Enter a value, or press u to unset the setting');
  }
  if (type === 'string') {
    return input;
  }
  const value: ConfigValue = parse(text);
  if (type?.startsWith('boolean') && typeof value !== 'boolean') {
    throw new Error(`Expected true or false, got ${text}`);
  }
  if (type?.startsWith('number') && typeof value !== 'number') {
    throw new Error(`Expected a number, got ${text}`);
  }
  return value;
};
