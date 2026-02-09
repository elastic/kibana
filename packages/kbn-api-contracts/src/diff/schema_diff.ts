/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';

export type SchemaChangeType =
  | 'property_added_optional'
  | 'property_added_required'
  | 'property_removed'
  | 'property_type_changed'
  | 'required_changed'
  | 'schema_structure_changed';

export interface SchemaChange {
  type: SchemaChangeType;
  path: string[];
  details?: {
    property?: string;
    wasRequired?: boolean;
    isRequired?: boolean;
    oldType?: string;
    newType?: string;
  };
}

export interface SchemaDiffResult {
  hasChanges: boolean;
  changes: SchemaChange[];
  hasBreakingChanges: boolean;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  allOf?: unknown[];
  oneOf?: unknown[];
  anyOf?: unknown[];
  $ref?: string;
  [key: string]: unknown;
}

const isSchemaObject = (value: unknown): value is SchemaObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getSchemaType = (schema: SchemaObject): string => {
  if (schema.$ref) return '$ref';
  if (schema.allOf) return 'allOf';
  if (schema.oneOf) return 'oneOf';
  if (schema.anyOf) return 'anyOf';
  return schema.type ?? 'unknown';
};

const isBreakingChange = (change: SchemaChange): boolean => {
  switch (change.type) {
    case 'property_added_optional':
      return false;
    case 'property_added_required':
      return true;
    case 'property_removed':
      return true;
    case 'property_type_changed':
      return true;
    case 'required_changed':
      return change.details?.isRequired === true;
    case 'schema_structure_changed':
      return true;
    default:
      return true;
  }
};

export const diffSchemas = (
  baseline: unknown,
  current: unknown,
  path: string[] = []
): SchemaDiffResult => {
  const changes: SchemaChange[] = [];

  if (equal(baseline, current)) {
    return { hasChanges: false, changes: [], hasBreakingChanges: false };
  }

  if (!isSchemaObject(baseline) || !isSchemaObject(current)) {
    changes.push({ type: 'schema_structure_changed', path });
    return { hasChanges: true, changes, hasBreakingChanges: true };
  }

  const baselineType = getSchemaType(baseline);
  const currentType = getSchemaType(current);

  if (baselineType !== currentType) {
    changes.push({
      type: 'property_type_changed',
      path,
      details: { oldType: baselineType, newType: currentType },
    });
    return { hasChanges: true, changes, hasBreakingChanges: true };
  }

  if (baseline.$ref || current.$ref) {
    if (baseline.$ref !== current.$ref) {
      changes.push({ type: 'schema_structure_changed', path });
    }
    return {
      hasChanges: changes.length > 0,
      changes,
      hasBreakingChanges: changes.some(isBreakingChange),
    };
  }

  if (baseline.properties || current.properties) {
    const baselineProps = baseline.properties ?? {};
    const currentProps = current.properties ?? {};
    const baselineRequired = new Set(baseline.required ?? []);
    const currentRequired = new Set(current.required ?? []);

    const allPropKeys = new Set([...Object.keys(baselineProps), ...Object.keys(currentProps)]);

    for (const propKey of allPropKeys) {
      const propPath = [...path, 'properties', propKey];
      const wasInBaseline = propKey in baselineProps;
      const isInCurrent = propKey in currentProps;
      const wasRequired = baselineRequired.has(propKey);
      const isRequired = currentRequired.has(propKey);

      if (!wasInBaseline && isInCurrent) {
        changes.push({
          type: isRequired ? 'property_added_required' : 'property_added_optional',
          path: propPath,
          details: { property: propKey, isRequired },
        });
      } else if (wasInBaseline && !isInCurrent) {
        changes.push({
          type: 'property_removed',
          path: propPath,
          details: { property: propKey, wasRequired },
        });
      } else if (wasInBaseline && isInCurrent) {
        if (wasRequired !== isRequired) {
          changes.push({
            type: 'required_changed',
            path: propPath,
            details: { property: propKey, wasRequired, isRequired },
          });
        }

        const nestedDiff = diffSchemas(baselineProps[propKey], currentProps[propKey], propPath);
        changes.push(...nestedDiff.changes);
      }
    }
  }

  if (baseline.items || current.items) {
    const itemsDiff = diffSchemas(baseline.items, current.items, [...path, 'items']);
    changes.push(...itemsDiff.changes);
  }

  const hasBreakingChanges = changes.some(isBreakingChange);
  return { hasChanges: changes.length > 0, changes, hasBreakingChanges };
};

export const diffResponseSchemas = (
  baseline: Record<string, unknown> | undefined,
  current: Record<string, unknown> | undefined
): SchemaDiffResult => {
  const changes: SchemaChange[] = [];

  if (equal(baseline, current)) {
    return { hasChanges: false, changes: [], hasBreakingChanges: false };
  }

  if (!baseline && current) {
    return { hasChanges: true, changes: [], hasBreakingChanges: false };
  }

  if (baseline && !current) {
    changes.push({ type: 'schema_structure_changed', path: ['responses'] });
    return { hasChanges: true, changes, hasBreakingChanges: true };
  }

  const baselineStatuses = new Set(Object.keys(baseline ?? {}));
  const currentStatuses = new Set(Object.keys(current ?? {}));

  for (const status of baselineStatuses) {
    if (!currentStatuses.has(status)) {
      changes.push({
        type: 'property_removed',
        path: ['responses', status],
        details: { property: status },
      });
    }
  }

  for (const status of currentStatuses) {
    if (!baselineStatuses.has(status)) {
      continue;
    }

    const baselineResponse = baseline![status] as Record<string, unknown>;
    const currentResponse = current![status] as Record<string, unknown>;

    const baselineContent = baselineResponse?.content as Record<string, unknown> | undefined;
    const currentContent = currentResponse?.content as Record<string, unknown> | undefined;

    if (baselineContent && currentContent) {
      for (const mediaType of Object.keys(baselineContent)) {
        if (!(mediaType in currentContent)) continue;

        const baselineMedia = baselineContent[mediaType] as Record<string, unknown>;
        const currentMedia = currentContent[mediaType] as Record<string, unknown>;

        if (baselineMedia?.schema || currentMedia?.schema) {
          const schemaDiff = diffSchemas(baselineMedia?.schema, currentMedia?.schema, [
            'responses',
            status,
            'content',
            mediaType,
            'schema',
          ]);
          changes.push(...schemaDiff.changes);
        }
      }
    }
  }

  const hasBreakingChanges = changes.some(isBreakingChange);
  return {
    hasChanges: changes.length > 0 || !equal(baseline, current),
    changes,
    hasBreakingChanges,
  };
};

export const diffRequestBodySchemas = (baseline: unknown, current: unknown): SchemaDiffResult => {
  const changes: SchemaChange[] = [];

  if (equal(baseline, current)) {
    return { hasChanges: false, changes: [], hasBreakingChanges: false };
  }

  if (!baseline && current) {
    changes.push({ type: 'schema_structure_changed', path: ['requestBody'] });
    return { hasChanges: true, changes, hasBreakingChanges: true };
  }

  if (baseline && !current) {
    changes.push({ type: 'property_removed', path: ['requestBody'] });
    return { hasChanges: true, changes, hasBreakingChanges: true };
  }

  const baselineBody = baseline as Record<string, unknown>;
  const currentBody = current as Record<string, unknown>;

  const baselineContent = baselineBody?.content as Record<string, unknown> | undefined;
  const currentContent = currentBody?.content as Record<string, unknown> | undefined;

  if (baselineContent && currentContent) {
    for (const mediaType of Object.keys(baselineContent)) {
      if (!(mediaType in currentContent)) continue;

      const baselineMedia = baselineContent[mediaType] as Record<string, unknown>;
      const currentMedia = currentContent[mediaType] as Record<string, unknown>;

      if (baselineMedia?.schema || currentMedia?.schema) {
        const schemaDiff = diffSchemas(baselineMedia?.schema, currentMedia?.schema, [
          'requestBody',
          'content',
          mediaType,
          'schema',
        ]);

        for (const change of schemaDiff.changes) {
          if (change.type === 'property_added_optional') {
            changes.push(change);
          } else if (change.type === 'property_added_required') {
            changes.push(change);
          } else {
            changes.push(change);
          }
        }
      }
    }
  }

  const hasBreakingChanges = changes.some(isBreakingChange);
  return {
    hasChanges: changes.length > 0 || !equal(baseline, current),
    changes,
    hasBreakingChanges,
  };
};

export const diffParameters = (
  baseline: unknown[] | undefined,
  current: unknown[] | undefined
): SchemaDiffResult => {
  const changes: SchemaChange[] = [];

  if (equal(baseline, current)) {
    return { hasChanges: false, changes: [], hasBreakingChanges: false };
  }

  if (!baseline && current) {
    const hasRequiredParams = current.some((p) => isSchemaObject(p) && p.required === true);
    if (hasRequiredParams) {
      changes.push({
        type: 'property_added_required',
        path: ['parameters'],
        details: { property: 'new required parameter' },
      });
    }
    return { hasChanges: true, changes, hasBreakingChanges: hasRequiredParams };
  }

  if (baseline && !current) {
    changes.push({ type: 'property_removed', path: ['parameters'] });
    return { hasChanges: true, changes, hasBreakingChanges: true };
  }

  const baselineParams = baseline as Array<Record<string, unknown>>;
  const currentParams = current as Array<Record<string, unknown>>;

  const getParamKey = (p: Record<string, unknown>) => `${p.in}:${p.name}`;
  const baselineByKey = new Map(baselineParams.map((p) => [getParamKey(p), p]));
  const currentByKey = new Map(currentParams.map((p) => [getParamKey(p), p]));

  for (const [key, param] of baselineByKey) {
    if (!currentByKey.has(key)) {
      changes.push({
        type: 'property_removed',
        path: ['parameters', key],
        details: { property: key, wasRequired: param.required === true },
      });
    }
  }

  for (const [key, param] of currentByKey) {
    const baselineParam = baselineByKey.get(key);

    if (!baselineParam) {
      const isRequired = param.required === true;
      changes.push({
        type: isRequired ? 'property_added_required' : 'property_added_optional',
        path: ['parameters', key],
        details: { property: key, isRequired },
      });
    } else {
      const wasRequired = baselineParam.required === true;
      const isRequired = param.required === true;

      if (!wasRequired && isRequired) {
        changes.push({
          type: 'required_changed',
          path: ['parameters', key],
          details: { property: key, wasRequired, isRequired },
        });
      }

      if (baselineParam.schema && param.schema) {
        const schemaDiff = diffSchemas(baselineParam.schema, param.schema, [
          'parameters',
          key,
          'schema',
        ]);
        changes.push(...schemaDiff.changes);
      }
    }
  }

  const hasBreakingChanges = changes.some(isBreakingChange);
  return {
    hasChanges: changes.length > 0 || !equal(baseline, current),
    changes,
    hasBreakingChanges,
  };
};
