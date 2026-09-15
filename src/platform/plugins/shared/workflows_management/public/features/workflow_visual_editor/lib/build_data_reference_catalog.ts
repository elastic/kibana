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
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { getWorkflowContextSchema } from '../../workflow_context/lib/get_workflow_context_schema';
import {
  getDocumentOrderPredecessors,
  type PrecedingStepRef,
} from './get_document_order_predecessors';

export type DataReferenceGroupId = 'event' | 'steps' | 'consts' | 'context';

export interface DataReferenceItem {
  /** Liquid path without braces, e.g. `steps.a.output.status`. */
  readonly path: string;
  /** Display type badge (`string`, `number`, `object`, …). */
  readonly typeLabel: string;
  /** When true, row drills into `children` instead of inserting. */
  readonly drillable: boolean;
  readonly children?: readonly DataReferenceItem[];
}

export interface DataReferenceGroup {
  readonly id: DataReferenceGroupId;
  readonly title: string;
  readonly scopeNote?: string;
  readonly items: readonly DataReferenceItem[];
}

export interface DataReferenceCatalog {
  readonly groups: readonly DataReferenceGroup[];
}

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

const schemaToItems = (schema: z.ZodType, pathPrefix: string): DataReferenceItem[] => {
  if (isOpaqueSchema(schema)) {
    return [
      {
        path: pathPrefix,
        typeLabel: 'object',
        drillable: false,
      },
    ];
  }

  const extracted = extractSchemaPropertyPaths(schema, { includeMetadata: true });
  if (extracted.length === 0) {
    return [
      {
        path: pathPrefix,
        typeLabel: 'object',
        drillable: false,
      },
    ];
  }

  // Build a tree from flat dotted paths under pathPrefix.
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
      return {
        path: node.path,
        typeLabel: kids.length > 0 ? 'object' : node.typeLabel,
        drillable: kids.length > 0,
        ...(kids.length > 0 ? { children: kids } : {}),
      };
    });

  return toItems(rootChildren);
};

const buildStepItems = (
  predecessors: readonly PrecedingStepRef[],
  connectors: readonly ConnectorContractUnion[]
): DataReferenceItem[] => {
  const items: DataReferenceItem[] = [];
  for (const step of predecessors) {
    const outputPath = `steps.${step.name}.output`;
    const outputSchema = resolveOutputSchema(step.type, connectors);
    if (isOpaqueSchema(outputSchema)) {
      // TODO(catalog): output schemas — opaque insertable object until catalog fills shapes.
      items.push({ path: outputPath, typeLabel: 'object', drillable: false });
      continue;
    }
    const children = schemaToItems(outputSchema, outputPath);
    if (children.length === 1 && children[0].path === outputPath && !children[0].drillable) {
      items.push(children[0]);
    } else {
      items.push({
        path: outputPath,
        typeLabel: 'object',
        drillable: true,
        children,
      });
    }
  }
  return items;
};

const buildContextItems = (): DataReferenceItem[] => {
  const workflowItems = schemaToItems(WorkflowDataContextSchema, 'workflow');
  const executionItems = schemaToItems(WorkflowExecutionContextSchema, 'execution');
  return [
    {
      path: 'workflow',
      typeLabel: 'object',
      drillable: true,
      children: workflowItems,
    },
    {
      path: 'execution',
      typeLabel: 'object',
      drillable: true,
      children: executionItems,
    },
    { path: 'kibanaUrl', typeLabel: 'string', drillable: false },
    { path: 'now', typeLabel: 'date', drillable: false },
  ];
};

/**
 * Builds the on-demand data-reference catalog for the step config panel.
 */
export const buildDataReferenceCatalog = ({
  definition,
  currentStepName,
  connectors,
}: {
  definition: WorkflowYaml | undefined;
  currentStepName: string;
  connectors: readonly ConnectorContractUnion[];
}): DataReferenceCatalog => {
  const groups: DataReferenceGroup[] = [];

  if (definition) {
    const contextSchema = getWorkflowContextSchema(definition);
    const eventField = (contextSchema as z.ZodObject<z.ZodRawShape>).shape?.event as
      | z.ZodType
      | undefined;
    if (eventField) {
      const eventItems = schemaToItems(unwrapSchema(eventField) as z.ZodType, 'event');
      if (eventItems.length > 0) {
        groups.push({
          id: 'event',
          title: i18n.translate('workflows.dataReferencePicker.triggerEvent', {
            defaultMessage: 'Trigger event',
          }),
          scopeNote: i18n.translate('workflows.dataReferencePicker.triggerScope', {
            defaultMessage: "From this workflow's trigger",
          }),
          items: eventItems,
        });
      }
    }

    const predecessors = getDocumentOrderPredecessors(definition.steps, currentStepName);
    const stepItems = buildStepItems(predecessors, connectors);
    if (stepItems.length > 0) {
      groups.push({
        id: 'steps',
        title: i18n.translate('workflows.dataReferencePicker.steps', {
          defaultMessage: 'Steps',
        }),
        scopeNote: i18n.translate('workflows.dataReferencePicker.stepsScope', {
          defaultMessage: 'only steps that run before this one',
        }),
        items: stepItems,
      });
    }

    const constKeys = Object.keys(definition.consts ?? {});
    if (constKeys.length > 0) {
      groups.push({
        id: 'consts',
        title: i18n.translate('workflows.dataReferencePicker.constants', {
          defaultMessage: 'Constants',
        }),
        items: constKeys.map((key) => ({
          path: `consts.${key}`,
          typeLabel: typeof (definition.consts as Record<string, unknown>)?.[key],
          drillable: false,
        })),
      });
    }
  }

  groups.push({
    id: 'context',
    title: i18n.translate('workflows.dataReferencePicker.workflowContext', {
      defaultMessage: 'Workflow context',
    }),
    items: buildContextItems(),
  });

  return { groups };
};

/** Flatten leaf (insertable) rows for global search. */
export const flattenDataReferenceLeaves = (
  items: readonly DataReferenceItem[]
): DataReferenceItem[] => {
  const leaves: DataReferenceItem[] = [];
  const walk = (list: readonly DataReferenceItem[]) => {
    for (const item of list) {
      if (item.drillable && item.children?.length) {
        walk(item.children);
      } else {
        leaves.push(item);
      }
    }
  };
  walk(items);
  return leaves;
};

export const formatDataReferenceToken = (path: string): string => `{{ ${path} }}`;
