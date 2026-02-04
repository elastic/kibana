/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import {
  dataIncludeStepCommonDefinition,
  type DataIncludeStepInputSchema,
  DataIncludeStepTypeId,
  OutputSchema,
} from '../../../common/steps/data/data_include_step';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

/**
 * Builds a Zod schema for a single object from a fields spec.
 * Nested objects in the spec become z.object(...); leaves become z.unknown().
 */
function buildObjectSchemaFromFieldsSpec(
  fieldsSpec: Record<string, unknown>
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const key of Object.keys(fieldsSpec)) {
    const val = fieldsSpec[key];
    const isNested =
      typeof val === 'object' &&
      val !== null &&
      !Array.isArray(val) &&
      Object.keys(val as object).length > 0;
    shape[key] = isNested
      ? buildObjectSchemaFromFieldsSpec(val as Record<string, unknown>)
      : z.unknown();
  }
  return z.object(shape);
}

export const dataIncludeStepDefinition: PublicStepDefinition = {
  ...dataIncludeStepCommonDefinition,
  editorHandlers: {
    dynamicSchema: {
      getOutputSchema: ({ input }) => {
        const typedInput = input as z.infer<DataIncludeStepInputSchema>;
        const fields = typedInput?.fields;
        if (
          typeof fields !== 'object' ||
          fields === null ||
          Array.isArray(fields) ||
          Object.keys(fields).length === 0
        ) {
          return OutputSchema;
        }
        const objectSchema = buildObjectSchemaFromFieldsSpec(fields as Record<string, unknown>);
        return z.union([z.array(objectSchema), objectSchema]);
      },
    },
  },
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/filter').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensions.dataIncludeStep.label', {
    defaultMessage: 'Include Fields',
  }),
  description: i18n.translate('workflowsExtensions.dataIncludeStep.description', {
    defaultMessage:
      'Project a subset of fields from objects or arrays; nested fields apply to each element',
  }),
  actionsMenuGroup: ActionsMenuGroup.data,
  documentation: {
    details: i18n.translate('workflowsExtensions.dataIncludeStep.documentation.details', {
      defaultMessage: `The ${DataIncludeStepTypeId} step returns only the fields you specify from the input. Provide an array or object as {itemParam}; if it is an array, the same field pattern is applied to every element; if it is an object, only the listed keys are kept. Nested keys in the fields spec apply to nested objects and to elements of arrays. Fields not listed are omitted. The output is accessible via {outputSyntax}.`,
      values: {
        itemParam: '`item`',
        outputSyntax: '`{{ steps.stepName.output }}`',
      },
    }),
    examples: [
      `## Include selected top-level fields
\`\`\`yaml
- name: include-fields
  type: ${DataIncludeStepTypeId}
  item: "\${{ steps.fetch.output }}"
  with:
    fields:
      id:
      name:
      created_at:
\`\`\``,

      `## Include nested fields
\`\`\`yaml
- name: include-fields
  type: ${DataIncludeStepTypeId}
  item: "\${{ steps.fetch.output }}"
  with:
    fields:
      id:
      name:
      metadata:
        source:
        version:
\`\`\``,
    ],
  },
};
