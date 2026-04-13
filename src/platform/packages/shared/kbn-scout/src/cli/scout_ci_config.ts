/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type ScoutCiConfigModuleKind = 'plugins' | 'packages';

export interface ScoutCiConfigModule {
  kind: ScoutCiConfigModuleKind;
  name: string;
}

const TOP_LEVEL_KEY_RE = /^[a-zA-Z_][\w-]*:\s*$/;

const readListItems = (
  lines: string[],
  startIndex: number,
  itemIndent: string
): { items: string[]; endIndex: number } => {
  const items: string[] = [];
  let i = startIndex;

  const prefix = `${itemIndent}- `;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.startsWith(prefix)) break;
    items.push(line.slice(prefix.length).trim());
    i += 1;
  }

  return { items, endIndex: i };
};

const replaceRange = (
  lines: string[],
  startIndex: number,
  endIndex: number,
  replacement: string[]
): string[] => {
  return [...lines.slice(0, startIndex), ...replacement, ...lines.slice(endIndex)];
};

const findLineIndex = (
  lines: string[],
  startIndex: number,
  endIndex: number,
  predicate: (line: string) => boolean
): number => {
  for (let i = startIndex; i < endIndex; i++) {
    if (predicate(lines[i])) return i;
  }
  return -1;
};

const findTopLevelSection = (
  lines: string[],
  section: string
): { startIndex: number; endIndex: number } => {
  const startIndex = findLineIndex(
    lines,
    0,
    lines.length,
    (l) => !l.startsWith(' ') && l.trimEnd() === `${section}:`
  );
  if (startIndex === -1) {
    throw new Error(`Unable to find top-level YAML section "${section}:"`);
  }

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line && TOP_LEVEL_KEY_RE.test(line)) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex };
};

const findIndentedKey = (
  lines: string[],
  sectionStartIndex: number,
  sectionEndIndex: number,
  key: string
): number => {
  return findLineIndex(
    lines,
    sectionStartIndex,
    sectionEndIndex,
    (l) => l.trimEnd() === `  ${key}:`
  );
};

export const getScoutCiConfigModuleFromPath = (relativePath: string): ScoutCiConfigModule => {
  const normalized = relativePath.trim().replace(/\\/g, '/').replace(/\/+$/g, '');
  const parts = normalized.split('/').filter(Boolean);

  const typeIndex = parts.findIndex((p) => p === 'plugins' || p === 'packages');
  if (typeIndex === -1 || typeIndex === parts.length - 1) {
    throw new Error(
      `Unable to determine whether "${relativePath}" is a plugin or package (expected path to include "/plugins/" or "/packages/")`
    );
  }

  const kind = parts[typeIndex] as ScoutCiConfigModuleKind;

  let nameParts = parts.slice(typeIndex + 1);
  if (nameParts[0] === 'shared' || nameParts[0] === 'private') {
    nameParts = nameParts.slice(1);
  }

  const name = nameParts.join('/');
  if (!name) {
    throw new Error(`Unable to determine module name from path "${relativePath}"`);
  }

  return { kind, name };
};

export interface UpsertScoutCiConfigModuleResult {
  updatedYml: string;
  didChange: boolean;
  wasAlreadyEnabled: boolean;
  movedFromDisabled: boolean;
}

export const upsertEnabledModuleInScoutCiConfigYml = (
  yml: string,
  module: ScoutCiConfigModule
): UpsertScoutCiConfigModuleResult => {
  const eol = yml.includes('\r\n') ? '\r\n' : '\n';
  const lines = yml.split(/\r?\n/);

  const { startIndex: sectionStartIndex, endIndex: sectionEndIndex } = findTopLevelSection(
    lines,
    module.kind
  );

  const enabledKeyIndex = findIndentedKey(lines, sectionStartIndex, sectionEndIndex, 'enabled');
  const disabledKeyIndex = findIndentedKey(lines, sectionStartIndex, sectionEndIndex, 'disabled');

  if (enabledKeyIndex === -1) {
    throw new Error(`Unable to find "${module.kind}.enabled" in Scout CI config`);
  }
  if (disabledKeyIndex === -1) {
    throw new Error(`Unable to find "${module.kind}.disabled" in Scout CI config`);
  }

  const enabledListStart = enabledKeyIndex + 1;
  const enabledList = readListItems(lines, enabledListStart, '    ');

  const disabledListStart = disabledKeyIndex + 1;
  const disabledList = readListItems(lines, disabledListStart, '    ');

  const wasAlreadyEnabled = enabledList.items.includes(module.name);

  const filteredDisabled = disabledList.items.filter((item) => item !== module.name);
  const movedFromDisabled = filteredDisabled.length !== disabledList.items.length;

  const nextEnabled = wasAlreadyEnabled ? enabledList.items : [...enabledList.items, module.name];
  const didChange = movedFromDisabled || !wasAlreadyEnabled;

  if (!didChange) {
    return { updatedYml: yml, didChange: false, wasAlreadyEnabled: true, movedFromDisabled: false };
  }

  const sortedEnabled = [...nextEnabled].sort();

  const enabledReplacement = sortedEnabled.map((item) => `    - ${item}`);
  const disabledReplacement = filteredDisabled.map((item) => `    - ${item}`);

  // Replace from bottom to top so earlier indices don't shift.
  let updatedLines = lines;
  updatedLines = replaceRange(
    updatedLines,
    disabledListStart,
    disabledList.endIndex,
    disabledReplacement
  );
  updatedLines = replaceRange(
    updatedLines,
    enabledListStart,
    enabledList.endIndex,
    enabledReplacement
  );

  return {
    updatedYml: updatedLines.join(eol),
    didChange: true,
    wasAlreadyEnabled,
    movedFromDisabled,
  };
};
