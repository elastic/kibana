/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import { isTriggerType } from '@kbn/workflows';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { z } from '@kbn/zod/v4';

/**
 * Get the shape of a Zod object schema (unwrap optional so we can read .shape).
 */
function getZodObjectShape(schema: z.ZodType): Record<string, z.ZodType> | undefined {
  const s = schema as unknown as { shape?: Record<string, z.ZodType>; unwrap?: () => z.ZodType };
  if (s.shape && typeof s.shape === 'object') {
    return s.shape;
  }
  if (typeof s.unwrap === 'function') {
    const unwrapped = s.unwrap() as unknown as { shape?: Record<string, z.ZodType> };
    return unwrapped?.shape;
  }
  return undefined;
}

/**
 * Get description from a Zod schema (Zod v4 exposes .description on described schemas).
 * Unwraps optional/inner type once if needed to find the description.
 */
function getZodDescription(schema: z.ZodType): string | undefined {
  const s = schema as unknown as {
    description?: string;
    unwrap?: () => z.ZodType;
    innerType?: z.ZodType;
  };
  if (typeof s.description === 'string') return s.description;
  const unwrappedSchema = s.unwrap?.() ?? s.innerType;
  if (unwrappedSchema) return getZodDescription(unwrappedSchema);
  return undefined;
}

/** Unwrap ZodOptional once so we can inspect the inner type. */
function tryUnwrapOptional(schema: z.ZodType): z.ZodType {
  const s = schema as unknown as { unwrap?: () => z.ZodType };
  return typeof s.unwrap === 'function' ? s.unwrap() : schema;
}

/** Infer a display type name from a Zod schema (e.g. string, object, number). */
function getZodTypeName(schema: z.ZodType): string {
  const unwrapped = tryUnwrapOptional(schema);
  try {
    const json = z.toJSONSchema(unwrapped) as Record<string, unknown>;
    if (json.type === 'object' && json.properties) return 'object';
    if (typeof json.type === 'string') return json.type;
    if (Array.isArray(json.type)) return (json.type as string[]).join(' | ');
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Display shape for one event schema property (derived from getEventSchemaProperties return type). */
type EventPropertyInfo = ReturnType<typeof getEventSchemaProperties>[number];

const DEFAULT_EVENT_SCHEMA_MAX_DEPTH = 20;

/**
 * Recursively collect event schema properties (including nested objects) for display.
 * Each property is emitted with a dotted path (e.g. foo, foo.bar, foo.bar.baz).
 * Uses a visited set to avoid infinite recursion on circular schema references.
 */
function getEventSchemaPropertiesRecursive(
  schema: z.ZodType,
  prefix: string,
  currentDepth: number,
  maxDepth: number = DEFAULT_EVENT_SCHEMA_MAX_DEPTH,
  visited: WeakSet<object> = new WeakSet()
): Array<{ name: string; type: string; description?: string }> {
  if (visited.has(schema as unknown as object)) return [];
  visited.add(schema as unknown as object);

  const shape = getZodObjectShape(schema);
  if (!shape || typeof shape !== 'object') return [];

  const result: Array<{ name: string; type: string; description?: string }> = [];

  for (const [key, subSchema] of Object.entries(shape)) {
    const fullName = prefix ? `${prefix}.${key}` : key;
    const description = getZodDescription(subSchema);
    const innerShape = getZodObjectShape(subSchema);

    if (innerShape && Object.keys(innerShape).length > 0 && currentDepth < maxDepth) {
      result.push({ name: fullName, type: 'object', description });
      result.push(
        ...getEventSchemaPropertiesRecursive(
          subSchema,
          fullName,
          currentDepth + 1,
          maxDepth,
          visited
        )
      );
    } else {
      result.push({
        name: fullName,
        type: getZodTypeName(subSchema),
        description,
      });
    }
  }

  return result;
}

/**
 * Extract event schema properties (name, type, description) from a Zod schema
 * for display in trigger hover. Nested objects are expanded so that e.g. foo.bar.baz
 * is listed as well as foo and foo.bar.
 */
function getEventSchemaProperties(eventSchema: z.ZodType): Array<{
  name: string;
  type: string;
  description?: string;
}> {
  try {
    return getEventSchemaPropertiesRecursive(
      eventSchema,
      '',
      0,
      DEFAULT_EVENT_SCHEMA_MAX_DEPTH,
      new WeakSet()
    );
  } catch {
    return [];
  }
}

/**
 * Format event properties as a tree: nested paths (e.g. foo.bar.baz) are shown
 * with indentation and segment names so the structure reads like foo: { bar: { baz: (string) } }.
 */
function formatEventPropertiesAsTree(eventProperties: EventPropertyInfo[]): string {
  const lines: string[] = [];
  for (const prop of eventProperties) {
    const parts = prop.name.split('.');
    const depth = parts.length - 1;
    const segment = parts[parts.length - 1] ?? prop.name;
    const indent = '  '.repeat(depth);
    const typeInfo = prop.type ? ` _(${prop.type})_` : '';
    lines.push(`${indent}- \`${segment}\`${typeInfo}`);
    if (prop.description) {
      lines.push(`${indent}  ${prop.description}`);
    }
  }
  return lines.join('\n');
}

function generateTriggerUsage(
  definition: PublicTriggerDefinition,
  triggerType: string,
  eventProperties: EventPropertyInfo[]
): string {
  const lines: string[] = [];

  if (eventProperties.length > 0) {
    lines.push(
      i18n.translate('workflows.triggerHover.eventPropertiesHeading', {
        defaultMessage: '**Event properties:**\n',
      })
    );
    lines.push(
      i18n.translate('workflows.triggerHover.eventPropertiesAccess', {
        defaultMessage: 'Access the event properties with event.*',
      })
    );
    lines.push('');
    lines.push(formatEventPropertiesAsTree(eventProperties));
    lines.push('');
  }

  const documentation = definition.documentation;
  if (documentation?.examples && documentation.examples.length > 0) {
    lines.push(
      i18n.translate('workflows.triggerHover.examplesHeading', {
        defaultMessage: '**Examples:**',
      })
    );
    lines.push('');
    for (const example of documentation.examples) {
      lines.push(example);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Build markdown hover content from a trigger definition (custom only; from extensions or fallback).
 */
function buildTriggerHoverFromDefinition(
  definition: PublicTriggerDefinition,
  triggerType: string
): monaco.IMarkdownString {
  const lines: string[] = [];
  lines.push(
    i18n.translate('workflows.triggerHover.workflowTriggerLabel', {
      defaultMessage: '**Workflow Trigger**: `{title}`',
      values: { title: definition.title ?? triggerType },
    })
  );
  lines.push('');
  lines.push(
    i18n.translate('workflows.triggerHover.triggerLabel', {
      defaultMessage: '**Trigger**: `{id}`',
      values: { id: definition.id },
    })
  );
  lines.push('');
  lines.push(
    i18n.translate('workflows.triggerHover.summaryLabel', {
      defaultMessage: '**Summary**: {description}',
      values: { description: definition.description },
    })
  );
  lines.push('');
  if (definition.documentation?.details) {
    lines.push(
      i18n.translate('workflows.triggerHover.descriptionLabel', {
        defaultMessage: '**Description**: {description}',
        values: { description: definition.documentation.details },
      })
    );
    lines.push('');
  }

  const eventProperties = getEventSchemaProperties(definition.eventSchema as z.ZodType);
  lines.push(generateTriggerUsage(definition, triggerType, eventProperties));

  return {
    value: lines.join('\n'),
    isTrusted: true,
    supportHtml: true,
  };
}

/**
 * Build markdown hover content for a trigger type (custom only).
 * Returns null for built-in triggers (manual, alert, scheduled) or when no definition is available for a custom trigger.
 */
export function getTriggerHoverContent(
  triggerType: string,
  triggerDefinition?: PublicTriggerDefinition | null
): monaco.IMarkdownString | null {
  if (isTriggerType(triggerType)) {
    return null;
  }
  if (!triggerDefinition) {
    return null;
  }
  return buildTriggerHoverFromDefinition(triggerDefinition, triggerType);
}

/**
 * Detect if the given YAML path is under a trigger and return that trigger's type value.
 * Accepts path to the type field (triggers.N.type) or anywhere under a trigger (triggers.N, triggers.N.on, etc.).
 */
export function getTriggerTypeAtPath(
  yamlPath: (string | number)[],
  getValueAtPath: (path: (string | number)[]) => unknown
): string | null {
  if (yamlPath.length < 1 || String(yamlPath[0]) !== 'triggers') return null;

  // Path is triggers.N.type — value at this path is the trigger type
  if (yamlPath.length >= 3 && yamlPath[1] !== undefined && String(yamlPath[2]) === 'type') {
    const value = getValueAtPath(yamlPath);
    if (typeof value === 'string') return value;
  }

  // Path is triggers.N or triggers.N.anything — resolve type from trigger object
  const index = yamlPath[1];
  if (typeof index === 'number' && index >= 0) {
    const value = getValueAtPath(['triggers', index, 'type']);
    if (typeof value === 'string') return value;
  }

  return null;
}
