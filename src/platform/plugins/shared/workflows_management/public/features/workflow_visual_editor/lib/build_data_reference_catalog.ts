/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import {
  extractSchemaPropertyPaths,
  getBuiltInStepDefinition,
  WorkflowDataContextSchema,
  WorkflowExecutionContextSchema,
} from '@kbn/workflows';
import { unwrapSchema } from '@kbn/workflows/common/utils/zod';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  extractNormalizedInputsFromYaml,
  normalizeFieldsToJsonSchema,
} from '@kbn/workflows/spec/lib/field_conversion';
import { BaseEventSchema } from '@kbn/workflows/spec/schema/common/base_event';
import { AlertEventSchema } from '@kbn/workflows/spec/schema/triggers/alert_trigger_schema';
import { isManualTrigger } from '@kbn/workflows/spec/schema/triggers/manual_trigger_schema';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import {
  getAllDocumentOrderSteps,
  getDocumentOrderPredecessors,
  type PrecedingStepRef,
} from './get_document_order_predecessors';

export type DataReferenceGroupId = 'triggers' | 'steps' | 'context';

export interface DataReferenceItem {
  /** Liquid path without braces, e.g. `steps.a.output.status`. */
  readonly path: string;
  /**
   * Primary label. Entities use the trigger/step name; leaves use the
   * reference path (shown in code font).
   */
  readonly label: string;
  /**
   * Second line — only when it adds information the first line lacks:
   * distinct step action type, or a constant's value. Never a path echo.
   */
  readonly subtitle?: string;
  /** Display type badge (`string`, `number`, `object`, …). */
  readonly typeLabel: string;
  /** When true, row drills into `children` instead of inserting. */
  readonly drillable: boolean;
  /**
   * Named trigger/step entity — chip icon, not insertable or draggable.
   * Nested objects are drillable leaves (`isEntity` unset).
   */
  readonly isEntity?: boolean;
  /** Step/trigger type for the entity chip (`StepIcon`). */
  readonly iconStepType?: string;
  readonly children?: readonly DataReferenceItem[];
  /** Search-result origin, e.g. `Trigger · Alert` / `Step · first`. */
  readonly originLabel: string;
  /** Plain-language note (schema-less step outputs) — tooltip only, not a row line. */
  readonly note?: string;
}

export interface DataReferenceGroup {
  readonly id: DataReferenceGroupId;
  readonly title: string;
  /** Keyboard-accessible info-icon tooltip on the group header. */
  readonly description: string;
  readonly items: readonly DataReferenceItem[];
  /** Shown when `items` is empty (Steps on the first step). */
  readonly emptyMessage?: string;
}

export interface DataReferenceCatalog {
  readonly groups: readonly DataReferenceGroup[];
}

export const isDataReferenceEntity = (item: DataReferenceItem): boolean => Boolean(item.isEntity);

/** Leaves and opaque objects insert; entities and intermediate objects drill only. */
export const isDataReferenceInsertable = (item: DataReferenceItem): boolean =>
  !item.isEntity && !(item.drillable && Boolean(item.children?.length));

/** Rows that expand/collapse in the field-editor accordion tree. */
export const isDataReferenceExpandable = (item: DataReferenceItem): boolean =>
  Boolean(item.children?.length);

/**
 * Drag payload for the field editor. Only insertable leaves get a grip —
 * trigger/step entities and expandable object parents (e.g. `workflow`) are
 * navigation/toggle only.
 */
export const isDataReferenceDraggable = (item: DataReferenceItem): boolean =>
  isDataReferenceInsertable(item);

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  alert: 'Alert',
  scheduled: 'Scheduled',
};

const triggerLabelFor = (type: string): string => TRIGGER_LABEL[type] ?? type;

/** Lowercase alphanumerics only — used to decide if a step type adds a second line. */
const normalizeLabelKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Show the action type under the step name only when it isn't already implied
 * by the name (`if_step` / "If" → hide; `SendHashtoVT` / "Scan File Hash" → show).
 */
const stepTypeSubtitleFor = (stepName: string, typeLabel: string): string | undefined => {
  const nameKey = normalizeLabelKey(stepName);
  const typeKey = normalizeLabelKey(typeLabel);
  if (!typeKey || nameKey === typeKey) return undefined;
  // Type is a short category token already present in the instance name.
  if (nameKey.includes(typeKey) || typeKey.includes(nameKey)) return undefined;
  return typeLabel;
};

const resolveStepTypeLabel = (
  stepType: string,
  connectors: readonly ConnectorContractUnion[]
): string => {
  const builtIn = getBuiltInStepDefinition(stepType);
  if (builtIn?.label) return builtIn.label;
  const connector = connectors.find((c) => c.type === stepType) as
    | (ConnectorContractUnion & { summary?: string | null; displayName?: string })
    | undefined;
  return connector?.summary || connector?.displayName || stepType;
};

const isOpaqueSchema = (schema: z.ZodType): boolean => {
  const inner = unwrapSchema(schema);
  if (inner instanceof z.ZodUnknown || inner instanceof z.ZodAny) return true;
  if (inner instanceof z.ZodObject && Object.keys(inner.shape as object).length === 0) return true;
  return false;
};

const resolveOutputSchema = (
  stepType: string,
  connectors: readonly ConnectorContractUnion[]
): z.ZodType => {
  const builtIn = getBuiltInStepDefinition(stepType);
  if (builtIn?.outputSchema) {
    return builtIn.outputSchema as z.ZodType;
  }
  const connector = connectors.find((c) => c.type === stepType);
  if (connector?.outputSchema) {
    return connector.outputSchema as z.ZodType;
  }
  // TODO(catalog): output schemas — many actions lack declared outputs.
  return z.unknown();
};

const formatConstValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/** Leaf / nested object row — primary label is the reference path; no path echo. */
const pathLeafItem = ({
  path,
  typeLabel,
  originLabel,
  drillable = false,
  children,
  subtitle,
  note,
}: {
  path: string;
  typeLabel: string;
  originLabel: string;
  drillable?: boolean;
  children?: readonly DataReferenceItem[];
  subtitle?: string;
  note?: string;
}): DataReferenceItem => ({
  path,
  label: path,
  typeLabel,
  drillable,
  originLabel,
  ...(subtitle !== undefined ? { subtitle } : {}),
  ...(note !== undefined ? { note } : {}),
  ...(children !== undefined ? { children } : {}),
});

const schemaToItems = (
  schema: z.ZodType,
  pathPrefix: string,
  originLabel: string
): DataReferenceItem[] => {
  if (isOpaqueSchema(schema)) {
    return [
      pathLeafItem({
        path: pathPrefix,
        typeLabel: 'object',
        originLabel,
      }),
    ];
  }

  const extracted = extractSchemaPropertyPaths(schema, { includeMetadata: true });
  if (extracted.length === 0) {
    return [
      pathLeafItem({
        path: pathPrefix,
        typeLabel: 'object',
        originLabel,
      }),
    ];
  }

  type Mutable = {
    path: string;
    typeLabel: string;
    children: Map<string, Mutable>;
  };
  const rootChildren = new Map<string, Mutable>();

  for (const entry of extracted) {
    const segments = entry.path.split('.');
    let cursor = rootChildren;
    let built = pathPrefix;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      built = built ? `${built}.${seg}` : seg;
      let node = cursor.get(seg);
      if (!node) {
        node = {
          path: built,
          typeLabel: i === segments.length - 1 ? entry.displayType ?? String(entry.type) : 'object',
          children: new Map(),
        };
        cursor.set(seg, node);
      } else if (i === segments.length - 1) {
        node.typeLabel = entry.displayType ?? String(entry.type);
      }
      cursor = node.children;
    }
  }

  const toItems = (map: Map<string, Mutable>): DataReferenceItem[] =>
    Array.from(map.values()).map((node) => {
      const kids = toItems(node.children);
      return pathLeafItem({
        path: node.path,
        typeLabel: kids.length > 0 ? 'object' : node.typeLabel,
        originLabel,
        drillable: kids.length > 0,
        ...(kids.length > 0 ? { children: kids } : {}),
      });
    });

  return toItems(rootChildren);
};

const buildManualInputsSchema = (definition: WorkflowYaml): z.ZodType => {
  const inputs = extractNormalizedInputsFromYaml(definition);
  const normalized = normalizeFieldsToJsonSchema(inputs);
  return buildFieldsZodValidator(normalized);
};

/** Per-trigger event schema — derived only from this workflow's configured trigger. */
const buildEventSchemaForTrigger = (
  trigger: { type?: string },
  manualInputsSchema: z.ZodType
): z.ZodType => {
  const type = trigger.type ?? '';
  if (type === 'alert') {
    return AlertEventSchema;
  }
  if (isManualTrigger(trigger)) {
    if (
      manualInputsSchema instanceof z.ZodObject &&
      Object.keys(manualInputsSchema.shape).length > 0
    ) {
      return BaseEventSchema.extend({ inputs: manualInputsSchema });
    }
    return BaseEventSchema;
  }
  return BaseEventSchema;
};

const buildTriggerGroup = (definition: WorkflowYaml): DataReferenceGroup => {
  const triggers = definition.triggers ?? [];
  const manualInputsSchema = buildManualInputsSchema(definition);
  const plural = triggers.length > 1;

  const title = plural
    ? i18n.translate('workflows.dataReferencePicker.triggersPlural', {
        defaultMessage: 'Triggers',
      })
    : i18n.translate('workflows.dataReferencePicker.triggerEvent', {
        defaultMessage: 'Trigger event',
      });

  const description = plural
    ? i18n.translate('workflows.dataReferencePicker.triggersPluralDescription', {
        defaultMessage:
          "Data from this workflow's triggers. Each trigger exposes different fields — values from one are undefined on runs started by another.",
      })
    : i18n.translate('workflows.dataReferencePicker.triggerEventDescription', {
        defaultMessage: "Data from this workflow's trigger.",
      });

  if (triggers.length === 0) {
    return { id: 'triggers', title, description, items: [] };
  }

  if (!plural) {
    const trigger = triggers[0];
    const type = trigger.type ?? 'manual';
    const originLabel = i18n.translate('workflows.dataReferencePicker.originTrigger', {
      defaultMessage: 'Trigger · {name}',
      values: { name: triggerLabelFor(type) },
    });
    const schema = buildEventSchemaForTrigger(trigger, manualInputsSchema);
    return {
      id: 'triggers',
      title,
      description,
      items: schemaToItems(unwrapSchema(schema) as z.ZodType, 'event', originLabel),
    };
  }

  const items: DataReferenceItem[] = triggers.map((trigger, index) => {
    const type = trigger.type ?? 'manual';
    const name = triggerLabelFor(type);
    const originLabel = i18n.translate('workflows.dataReferencePicker.originTrigger', {
      defaultMessage: 'Trigger · {name}',
      values: { name },
    });
    const schema = buildEventSchemaForTrigger(trigger, manualInputsSchema);
    const children = schemaToItems(unwrapSchema(schema) as z.ZodType, 'event', originLabel);
    // Distinct path key when two triggers share a type (not a Liquid path).
    const entityPath = `__trigger_${index}_${type}`;
    return {
      path: entityPath,
      label: name,
      typeLabel: 'object',
      drillable: true,
      isEntity: true,
      iconStepType: `trigger_${type}`,
      originLabel,
      children,
    };
  });

  return {
    id: 'triggers',
    title,
    description,
    items,
  };
};

const buildStepEntities = (
  predecessors: readonly PrecedingStepRef[],
  connectors: readonly ConnectorContractUnion[]
): DataReferenceItem[] => {
  const opaqueNote = i18n.translate('workflows.dataReferencePicker.opaqueStepOutputNote', {
    defaultMessage:
      'This action does not declare output fields yet. Insert the whole output object.',
  });

  return predecessors.map((step) => {
    const outputPath = `steps.${step.name}.output`;
    const typeLabel = resolveStepTypeLabel(step.type, connectors);
    const originLabel = i18n.translate('workflows.dataReferencePicker.originStep', {
      defaultMessage: 'Step · {name}',
      values: { name: step.name },
    });
    const outputSchema = resolveOutputSchema(step.type, connectors);

    let children: DataReferenceItem[];
    if (isOpaqueSchema(outputSchema)) {
      // TODO(catalog): output schemas — opaque insertable object until catalog fills shapes.
      children = [
        pathLeafItem({
          path: outputPath,
          typeLabel: 'object',
          originLabel,
          note: opaqueNote,
        }),
      ];
    } else {
      children = schemaToItems(outputSchema, outputPath, originLabel);
      if (
        children.length === 1 &&
        children[0].path === outputPath &&
        !children[0].drillable
      ) {
        children = [{ ...children[0], note: opaqueNote }];
      }
    }

    const typeSubtitle = stepTypeSubtitleFor(step.name, typeLabel);
    return {
      path: outputPath,
      label: step.name,
      ...(typeSubtitle !== undefined ? { subtitle: typeSubtitle } : {}),
      typeLabel: 'object',
      drillable: true,
      isEntity: true,
      iconStepType: step.type,
      originLabel,
      children,
    };
  });
};

const buildContextGroup = (definition: WorkflowYaml | undefined): DataReferenceGroup => {
  const originContext = i18n.translate('workflows.dataReferencePicker.originContext', {
    defaultMessage: 'Workflow context',
  });
  const items: DataReferenceItem[] = [];

  for (const [key, value] of Object.entries(definition?.consts ?? {})) {
    items.push(
      pathLeafItem({
        path: `consts.${key}`,
        typeLabel: typeof value,
        originLabel: originContext,
        subtitle: formatConstValue(value),
      })
    );
  }

  const workflowChildren = schemaToItems(WorkflowDataContextSchema, 'workflow', originContext);
  items.push(
    pathLeafItem({
      path: 'workflow',
      typeLabel: 'object',
      originLabel: originContext,
      drillable: workflowChildren.length > 0,
      ...(workflowChildren.length > 0 ? { children: workflowChildren } : {}),
    })
  );

  const executionChildren = schemaToItems(
    WorkflowExecutionContextSchema,
    'execution',
    originContext
  );
  items.push(
    pathLeafItem({
      path: 'execution',
      typeLabel: 'object',
      originLabel: originContext,
      drillable: executionChildren.length > 0,
      ...(executionChildren.length > 0 ? { children: executionChildren } : {}),
    })
  );

  items.push(
    pathLeafItem({
      path: 'kibanaUrl',
      typeLabel: 'string',
      originLabel: originContext,
    }),
    pathLeafItem({
      path: 'now',
      typeLabel: 'date',
      originLabel: originContext,
    })
  );

  return {
    id: 'context',
    title: i18n.translate('workflows.dataReferencePicker.workflowContext', {
      defaultMessage: 'Workflow context',
    }),
    description: i18n.translate('workflows.dataReferencePicker.workflowContextDescription', {
      defaultMessage:
        "This workflow's constants, plus execution metadata and Kibana URLs available at run time.",
    }),
    items,
  };
};

/**
 * Builds the on-demand data-reference catalog for the step config panel and
 * field-editor tree. Every entry resolves from the edited workflow document.
 *
 * `stepsScope`:
 * - `predecessors` (default) — only steps before `currentStepName`
 * - `allSteps` — every step (for workflow outputs evaluated after the run)
 */
export const buildDataReferenceCatalog = ({
  definition,
  currentStepName,
  connectors,
  stepsScope = 'predecessors',
}: {
  definition: WorkflowYaml | undefined;
  currentStepName: string;
  connectors: readonly ConnectorContractUnion[];
  readonly stepsScope?: 'predecessors' | 'allSteps';
}): DataReferenceCatalog => {
  const groups: DataReferenceGroup[] = [];

  if (definition) {
    groups.push(buildTriggerGroup(definition));
  } else {
    groups.push({
      id: 'triggers',
      title: i18n.translate('workflows.dataReferencePicker.triggerEvent', {
        defaultMessage: 'Trigger event',
      }),
      description: i18n.translate('workflows.dataReferencePicker.triggerEventDescription', {
        defaultMessage: "Data from this workflow's trigger.",
      }),
      items: [],
    });
  }

  const stepRefs =
    definition == null
      ? []
      : stepsScope === 'allSteps'
        ? getAllDocumentOrderSteps(definition.steps)
        : getDocumentOrderPredecessors(definition.steps, currentStepName);

  groups.push({
    id: 'steps',
    title: i18n.translate('workflows.dataReferencePicker.steps', {
      defaultMessage: 'Steps',
    }),
    description:
      stepsScope === 'allSteps'
        ? i18n.translate('workflows.dataReferencePicker.stepsAllDescription', {
            defaultMessage:
              'Output from any step in this workflow — outputs are evaluated after the run finishes.',
          })
        : i18n.translate('workflows.dataReferencePicker.stepsDescription', {
            defaultMessage:
              "Output from steps in this workflow that run before the one you're editing.",
          }),
    items: buildStepEntities(stepRefs, connectors),
    emptyMessage:
      stepsScope === 'allSteps'
        ? i18n.translate('workflows.dataReferencePicker.stepsAllEmpty', {
            defaultMessage: 'No steps in this workflow yet.',
          })
        : i18n.translate('workflows.dataReferencePicker.stepsEmpty', {
            defaultMessage: 'No earlier steps — this is the first step in the workflow.',
          }),
  });

  groups.push(buildContextGroup(definition));

  return { groups };
};

/** Flatten insertable leaves for global search (any depth, including undrilled entities). */
export const flattenDataReferenceLeaves = (
  catalogOrItems: DataReferenceCatalog | readonly DataReferenceItem[]
): DataReferenceItem[] => {
  const leaves: DataReferenceItem[] = [];
  const walk = (list: readonly DataReferenceItem[]) => {
    for (const item of list) {
      if (item.children?.length && (item.isEntity || item.drillable)) {
        walk(item.children);
        continue;
      }
      if (isDataReferenceInsertable(item)) {
        leaves.push(item);
      }
    }
  };

  if (Array.isArray(catalogOrItems)) {
    walk(catalogOrItems);
  } else {
    for (const group of catalogOrItems.groups) {
      walk(group.items);
    }
  }
  return leaves;
};

export const formatDataReferenceToken = (path: string): string => `{{ ${path} }}`;
