/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type YamlValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | YamlValue[]
  | { [key: string]: YamlValue };

export interface YamlObject {
  [key: string]: YamlValue;
}

export interface WorkflowStep extends YamlObject {
  name: string;
  type: string;
}

export interface WorkflowDocument extends YamlObject {
  description?: string;
  tags?: string[];
  consts?: YamlObject;
  triggers?: YamlObject[];
  steps?: WorkflowStep[];
}

export type DiffKind = 'missing' | 'extra' | 'different';

export interface RebuildDiff {
  where: string;
  what: string;
  kind: DiffKind;
  expected: string | undefined;
  built: string | undefined;
}

export interface CompareResult {
  diffs: RebuildDiff[];
  identical: number;
  total: number;
}

/** The text the app puts in the description of a workflow created without one. */
const APP_DEFAULT_DESCRIPTION = 'This is a new workflow';
const NON_COMPARED_STEP_KEYS = new Set(['name', 'type', 'steps', 'else', 'cases', 'default']);

export const isObject = (value: YamlValue): value is YamlObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const asObjects = (value: YamlValue): YamlObject[] =>
  Array.isArray(value) ? value.filter(isObject) : [];

export const asSteps = (value: YamlValue): WorkflowStep[] =>
  asObjects(value).filter(
    (item): item is WorkflowStep => typeof item.name === 'string' && typeof item.type === 'string'
  );

const sortKeys = (value: YamlValue): YamlValue => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])])
    );
  }
  return value;
};

/**
 * Makes two values that mean the same thing compare equal: `steps['a-b']` and `steps.a-b`, `${{ x }}` and
 * `{{x}}`, and runs of white space.
 */
const normalizeValue = (value: YamlValue): YamlValue => {
  if (typeof value === 'string') {
    return value
      .replace(/\[\s*(['"])(.*?)\1\s*\]/g, '.$2')
      .replace(/\$\{\{/g, '{{')
      .replace(/\{\{\s*([\s\S]*?)\s*\}\}/g, '{{$1}}')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeValue(item)])
    );
  }
  return value;
};

const isEmpty = (value: YamlValue): boolean =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0) ||
  (isObject(value) && Object.keys(value).length === 0);

const isSame = (a: YamlValue, b: YamlValue): boolean =>
  (isEmpty(a) && isEmpty(b)) ||
  JSON.stringify(sortKeys(normalizeValue(a ?? null))) ===
    JSON.stringify(sortKeys(normalizeValue(b ?? null)));

/** Every step of a tree with its path (`a > else > b`), the same paths the rebuild reports its problems under. */
export const flattenSteps = (
  steps: WorkflowStep[] | undefined,
  path = ''
): Array<{ path: string; step: WorkflowStep }> =>
  (steps ?? []).flatMap((step) => {
    const here = `${path}${step.name}`;
    const onFailure = step['on-failure'];
    const children = [
      ...flattenSteps(asSteps(step.steps), `${here} > `),
      ...flattenSteps(asSteps(step.else), `${here} > else > `),
      ...flattenSteps(asSteps(step.default), `${here} > default > `),
      ...asObjects(step.cases).flatMap((item, index) =>
        flattenSteps(asSteps(item.steps), `${here} > case ${index} > `)
      ),
      ...flattenSteps(
        isObject(onFailure) ? asSteps(onFailure.fallback) : [],
        `${here} > fallback > `
      ),
    ];
    return [{ path: here, step }, ...children];
  });

/** The form saves trigger inputs as a JSON schema; a library workflow lists them. */
const inputsAsSchema = (inputs: YamlValue): YamlValue => {
  if (!Array.isArray(inputs)) return inputs;
  const properties: YamlObject = {};
  for (const input of inputs.filter(isObject)) {
    const { name, type, description } = input;
    const allowed = input.options ?? input.enum;
    properties[String(name)] = {
      type: type === 'choice' ? 'string' : type,
      // The form also gives every array input string items.
      ...(type === 'array' ? { items: { type: 'string' } } : {}),
      ...(description ? { description } : {}),
      ...(input.default !== undefined ? { default: input.default } : {}),
      ...(allowed ? { enum: allowed } : {}),
    };
  }
  const required = inputs
    .filter(isObject)
    .filter((input) => input.required === true && input.default === undefined)
    .map((input) => input.name);
  return { type: 'object', properties, ...(required.length ? { required } : {}) };
};

const triggerShape = (trigger: YamlObject): YamlObject => ({
  type: trigger.type,
  ...(trigger.with ? { with: trigger.with } : {}),
  ...(trigger.inputs ? { inputs: inputsAsSchema(trigger.inputs) } : {}),
});

const triggerProperties = (trigger: YamlObject): YamlObject => {
  const { inputs } = trigger;
  return isObject(inputs) && isObject(inputs.properties) ? inputs.properties : {};
};

const triggerRequired = (trigger: YamlObject): YamlValue =>
  isObject(trigger.inputs) ? trigger.inputs.required : undefined;

/** Compares the workflow that was rebuilt through the graph (`built`) with the one it was meant to reproduce. */
export const compareWorkflows = (
  expected: WorkflowDocument,
  built: WorkflowDocument
): CompareResult => {
  const diffs: RebuildDiff[] = [];
  const addDiff = (
    where: string,
    what: string,
    expectedValue: YamlValue,
    builtValue: YamlValue
  ) => {
    const kind: DiffKind =
      expectedValue === undefined || expectedValue === null
        ? 'extra'
        : builtValue === undefined || builtValue === null
        ? 'missing'
        : 'different';
    diffs.push({
      where,
      what,
      kind,
      expected: JSON.stringify(expectedValue)?.slice(0, 500),
      built: JSON.stringify(builtValue)?.slice(0, 500),
    });
  };

  // Exact (line breaks included), unlike the step values: the settings form trims the description, nothing else.
  const trimmed = (value: string | undefined) => (typeof value === 'string' ? value.trim() : null);
  const builtDescription =
    built.description === APP_DEFAULT_DESCRIPTION && !expected.description
      ? undefined
      : built.description;
  if (trimmed(expected.description) !== trimmed(builtDescription)) {
    addDiff('workflow', 'description', expected.description, built.description);
  }
  for (const key of ['tags', 'consts'] as const) {
    if (!isSame(expected[key], built[key])) addDiff('workflow', key, expected[key], built[key]);
  }

  const expectedTriggers = (expected.triggers ?? []).map(triggerShape);
  const builtTriggers = (built.triggers ?? []).map(triggerShape);
  expectedTriggers.forEach((expectedTrigger, index) => {
    const builtTrigger = builtTriggers[index];
    const here = `trigger ${index + 1} (${expectedTrigger.type})`;
    if (!builtTrigger) return addDiff(here, 'missing trigger', expectedTrigger.type, null);
    if (builtTrigger.type !== expectedTrigger.type) {
      addDiff(here, 'type', expectedTrigger.type, builtTrigger.type);
    }
    if (!isSame(expectedTrigger.with, builtTrigger.with)) {
      addDiff(here, 'with', expectedTrigger.with, builtTrigger.with);
    }
    const expectedProperties = triggerProperties(expectedTrigger);
    const builtProperties = triggerProperties(builtTrigger);
    for (const name of new Set([
      ...Object.keys(expectedProperties),
      ...Object.keys(builtProperties),
    ])) {
      if (!isSame(expectedProperties[name], builtProperties[name])) {
        addDiff(here, `input ${name}`, expectedProperties[name], builtProperties[name]);
      }
    }
    if (!isSame(triggerRequired(expectedTrigger), triggerRequired(builtTrigger))) {
      addDiff(
        here,
        'required inputs',
        triggerRequired(expectedTrigger),
        triggerRequired(builtTrigger)
      );
    }
  });
  if (builtTriggers.length > expectedTriggers.length) {
    addDiff('workflow', 'extra triggers', null, builtTriggers.slice(expectedTriggers.length));
  }

  const builtSteps = new Map(flattenSteps(built.steps).map(({ path, step }) => [path, step]));
  const wanted = flattenSteps(expected.steps);
  let identical = 0;
  /** Compares one key of a step with the same key of the step that was built. */
  const compareStepKey = (path: string, key: string, want: YamlValue, have: YamlValue) => {
    if (key === 'on-failure') {
      // The fallback steps are compared as steps of their own.
      const withoutFallback = (value: YamlValue) =>
        isObject(value) ? { ...value, fallback: undefined } : value;
      if (!isSame(withoutFallback(want), withoutFallback(have))) addDiff(path, key, want, have);
    } else if (key === 'with' && isObject(want) && isObject(have)) {
      for (const field of new Set([...Object.keys(want), ...Object.keys(have)])) {
        if (!isSame(want[field], have[field])) {
          addDiff(path, `with.${field}`, want[field], have[field]);
        }
      }
    } else if (!isSame(want, have)) {
      addDiff(path, key, want, have);
    }
  };

  for (const { path, step } of wanted) {
    const got = builtSteps.get(path);
    if (!got) {
      addDiff(path, 'missing step', step.type, null);
    } else {
      const before = diffs.length;
      if (got.type !== step.type) addDiff(path, 'type', step.type, got.type);
      for (const key of new Set([...Object.keys(step), ...Object.keys(got)])) {
        if (!NON_COMPARED_STEP_KEYS.has(key)) compareStepKey(path, key, step[key], got[key]);
      }
      const matches = (item: YamlObject) => String(item.match);
      const wantedCases = asObjects(step.cases).map(matches);
      const builtCases = asObjects(got.cases).map(matches);
      if (step.type === 'switch' && JSON.stringify(wantedCases) !== JSON.stringify(builtCases)) {
        addDiff(path, 'switch cases', wantedCases, builtCases);
      }
      if (diffs.length === before) identical += 1;
    }
  }
  return { diffs, identical, total: wanted.length };
};
