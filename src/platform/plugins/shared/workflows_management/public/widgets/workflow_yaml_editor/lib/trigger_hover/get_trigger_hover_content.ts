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

/** Display shape for one event schema property (derived from getEventSchemaProperties return type). */
type EventPropertyInfo = ReturnType<typeof getEventSchemaProperties>[number];

/**
 * Extract event schema properties (name, type, description) from a Zod schema
 * for display in trigger hover. Uses JSON Schema for structure and falls back
 * to Zod schema .description when toJSONSchema omits it.
 */
function getEventSchemaProperties(eventSchema: z.ZodType): Array<{
  name: string;
  type: string;
  description?: string;
}> {
  try {
    const jsonSchema = z.toJSONSchema(eventSchema) as Record<string, unknown>;
    const properties = jsonSchema?.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!properties || typeof properties !== 'object') {
      return [];
    }

    const shape = getZodObjectShape(eventSchema);

    return Object.entries(properties).map(([name, prop]) => {
      let desc = typeof prop?.description === 'string' ? prop.description : undefined;
      if (!desc && shape?.[name]) {
        desc = getZodDescription(shape[name]);
      }
      const rawType = prop?.type;
      const type =
        typeof rawType === 'string'
          ? rawType
          : Array.isArray(rawType)
          ? (rawType as string[]).join(' | ')
          : 'unknown';
      return { name, type, description: desc };
    });
  } catch {
    return [];
  }
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
    for (const prop of eventProperties) {
      const typeInfo = prop.type ? ` _(${prop.type})_` : '';
      lines.push(`- \`${prop.name}\`${typeInfo}`);
      if (prop.description) {
        lines.push(`  ${prop.description}`);
      }
    }
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
 * Accepts path to the type field (triggers.N.type) or anywhere under a trigger (triggers.N or triggers.N.with, etc.).
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
