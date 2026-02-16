/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { convertLegacyInputsToJsonSchema } from './lib/input_conversion';
import { JsonModelSchema } from './schema/common/json_model_schema';
import { TriggerSchema } from './schema/triggers/trigger_schema';

export const DurationSchema = z.string().regex(/^\d+(ms|[smhdw])$/, 'Invalid duration format');

/* -- Settings -- */
export const RetryPolicySchema = z.object({
  'max-attempts': z.number().int().min(1).optional(),
  'timeout-seconds': z.number().int().min(1).optional(),
});

export const WorkflowRetrySchema = z.object({
  'max-attempts': z.number().min(1),
  condition: z.string().optional(), // e.g., "${{error.type == 'NetworkError'}}" (default: always retry)
  delay: z
    .string()
    .regex(/^\d+(ms|[smhdw])$/, 'Invalid duration format')
    .optional(), // e.g., '5s', '1m', '2h' (default: no delay)
});
export type WorkflowRetry = z.infer<typeof WorkflowRetrySchema>;

// Base step schema, with recursive steps property
export const BaseStepSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
});
export type BaseStep = z.infer<typeof BaseStepSchema>;

export const WorkflowOnFailureSchema = z.object({
  retry: WorkflowRetrySchema.optional(),
  fallback: z.array(BaseStepSchema).min(1).optional(),
  continue: z.union([z.boolean(), z.string()]).optional(),
});

export type WorkflowOnFailure = z.infer<typeof WorkflowOnFailureSchema>;

export function getOnFailureStepSchema(stepSchema: z.ZodType, loose: boolean = false) {
  const schema = WorkflowOnFailureSchema.extend({
    fallback: z.array(stepSchema).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial();
  }

  return schema;
}

export const CollisionStrategySchema = z.enum(['cancel-in-progress', 'drop']);
export type CollisionStrategy = z.infer<typeof CollisionStrategySchema>;

export const ConcurrencySettingsSchema = z.object({
  key: z.string().optional(), // Concurrency group identifier e.g., '{{ event.host.name }}'
  strategy: CollisionStrategySchema.optional(), // 'drop' or 'cancel-in-progress'
  max: z.number().int().min(1).optional(), // Max concurrent runs per concurrency group
});
export type ConcurrencySettings = z.infer<typeof ConcurrencySettingsSchema>;

export const WorkflowSettingsSchema = z.object({
  'on-failure': WorkflowOnFailureSchema.optional(),
  timezone: z.string().optional(), // Should follow IANA TZ format
  timeout: DurationSchema.optional(), // e.g., '5s', '1m', '2h'
  concurrency: ConcurrencySettingsSchema.optional(),
});
export type WorkflowSettings = z.infer<typeof WorkflowSettingsSchema>;

export function getWorkflowSettingsSchema(stepSchema: z.ZodType, loose: boolean = false) {
  const schema = WorkflowSettingsSchema.extend({
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial();
  }

  return schema;
}

/* --- Steps --- */
export const TimeoutPropSchema = z.object({
  timeout: DurationSchema.optional(),
});
export type TimeoutProp = z.infer<typeof TimeoutPropSchema>;

const StepWithForEachSchema = z.object({
  foreach: z.union([z.string(), z.array(z.unknown())]).optional(),
});
export type StepWithForeach = z.infer<typeof StepWithForEachSchema>;

export type StepWithOnFailure = z.infer<typeof StepWithOnFailureSchema>;

const StepWithIfConditionSchema = z.object({
  if: z.string().optional(),
});
export type StepWithIfCondition = z.infer<typeof StepWithIfConditionSchema>;

export const StepWithOnFailureSchema = z.object({
  'on-failure': WorkflowOnFailureSchema.optional(),
});

export const BaseConnectorStepSchema = BaseStepSchema.extend({
  type: z.string().min(1),
  with: z.record(z.string(), z.any()).optional(),
})
  .merge(StepWithIfConditionSchema)
  .merge(StepWithForEachSchema)
  .merge(TimeoutPropSchema)
  .merge(StepWithOnFailureSchema);
export type ConnectorStep = z.infer<typeof BaseConnectorStepSchema>;

export const BuiltInStepProperties = [
  'name',
  'type',
  'with',
  'if',
  'foreach',
  'timeout',
  'on-failure',
];
export type BuiltInStepProperty = (typeof BuiltInStepProperties)[number];

export const WaitStepSchema = BaseStepSchema.extend({
  type: z.literal('wait'),
  with: z.object({
    duration: DurationSchema, // e.g., '5s', '1m', '2h'
  }),
});
export type WaitStep = z.infer<typeof WaitStepSchema>;

export const DataSetStepSchema = BaseStepSchema.extend({
  type: z.literal('data.set'),
  with: z.record(z.string(), z.unknown()),
});
export type DataSetStep = z.infer<typeof DataSetStepSchema>;

// Fetcher configuration for HTTP request customization (shared across formats)
export const FetcherConfigSchema = z
  .object({
    skip_ssl_verification: z.boolean().optional(),
    follow_redirects: z.boolean().optional(),
    max_redirects: z.number().optional(),
    keep_alive: z.boolean().optional(),
  })
  .meta({ $id: 'fetcher', description: 'Fetcher configuration for HTTP request customization' })
  .optional();

export const HttpStepSchema = BaseStepSchema.extend({
  type: z.literal('http'),
  with: z.object({
    url: z.string().min(1),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('GET'),
    headers: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional()
      .default({}),
    body: z.any().optional(),
    timeout: z.string().optional().default('30s'),
    fetcher: FetcherConfigSchema,
  }),
})
  .merge(StepWithIfConditionSchema)
  .merge(StepWithForEachSchema)
  .merge(TimeoutPropSchema)
  .merge(StepWithOnFailureSchema);
export type HttpStep = z.infer<typeof HttpStepSchema>;

// Generic Elasticsearch step schema for backend validation
export const ElasticsearchStepSchema = BaseStepSchema.extend({
  type: z.string().refine((val) => val.startsWith('elasticsearch.'), {
    message: 'Elasticsearch step type must start with "elasticsearch."',
  }),
  with: z.union([
    // Raw API format - like Dev Console
    z.object({
      request: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']).optional().default('GET'),
        path: z.string().min(1),
        body: z.any().optional(),
      }),
    }),
    // Sugar syntax for common operations
    z
      .object({
        index: z.string().optional(),
        id: z.string().optional(),
        query: z.record(z.string(), z.any()).optional(),
        body: z.record(z.string(), z.any()).optional(),
        size: z.number().optional(),
        from: z.number().optional(),
        sort: z.array(z.any()).optional(),
        _source: z.union([z.boolean(), z.array(z.string()), z.string()]).optional(),
        aggs: z.record(z.string(), z.any()).optional(),
        aggregations: z.record(z.string(), z.any()).optional(),
      })
      .and(z.record(z.string(), z.any())), // Allow additional properties for flexibility
  ]),
});
export type ElasticsearchStep = z.infer<typeof ElasticsearchStepSchema>;

// Kibana step meta options that control routing and debugging (not forwarded as HTTP params)
export const KibanaStepMetaSchema = {
  forceServerInfo: z
    .boolean()
    .optional()
    .describe('Force using the server info URL (internal host:port) instead of the public URL'),
  forceLocalhost: z
    .boolean()
    .optional()
    .describe('Force using localhost:5601 instead of the configured URL'),
  debug: z
    .boolean()
    .optional()
    .describe('Include the resolved full URL in the step output for debugging'),
};

// Generic Kibana step schema for backend validation
export const KibanaStepSchema = BaseStepSchema.extend({
  type: z.string().refine((val) => val.startsWith('kibana.'), {
    message: 'Kibana step type must start with "kibana."',
  }),
  with: z.union([
    // Raw API format - direct HTTP API calls
    z.object({
      request: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']).optional().default('GET'),
        path: z.string().min(1),
        body: z.any().optional(),
        headers: z.record(z.string(), z.string()).optional(),
      }),
      fetcher: FetcherConfigSchema,
      ...KibanaStepMetaSchema,
    }),
    // Sugar syntax for common Kibana operations
    z
      .object({
        // Cases API
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        assignees: z.array(z.string()).optional(),
        owner: z.string().optional(),
        connector: z.record(z.string(), z.any()).optional(),
        settings: z.record(z.string(), z.any()).optional(),
        // Generic parameters
        id: z.string().optional(),
        case_id: z.string().optional(),
        space_id: z.string().optional(),
        page: z.number().optional(),
        perPage: z.number().optional(),
        status: z.string().optional(),
        fetcher: FetcherConfigSchema,
        ...KibanaStepMetaSchema,
      })
      .and(z.record(z.string(), z.any())), // Allow additional properties for flexibility
  ]),
});
export type KibanaStep = z.infer<typeof KibanaStepSchema>;

export function getHttpStepSchema(stepSchema: z.ZodType, loose: boolean = false) {
  const schema = HttpStepSchema.extend({
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
}

export const ForEachStepSchema = BaseStepSchema.extend({
  type: z.literal('foreach'),
  foreach: z.union([z.string(), z.array(z.unknown())]),
  steps: z.array(BaseStepSchema).min(1),
}).merge(StepWithIfConditionSchema);
export type ForEachStep = z.infer<typeof ForEachStepSchema>;

export const getForEachStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = ForEachStepSchema.extend({
    steps: z.array(stepSchema).min(1),
    'on-failure': getOnFailureStepSchema(stepSchema, loose).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
};

export const IfStepSchema = BaseStepSchema.extend({
  type: z.literal('if'),
  condition: z.string(),
  steps: z.array(BaseStepSchema).min(1),
  else: z.array(BaseStepSchema).optional(),
});
export type IfStep = z.infer<typeof IfStepSchema>;

export const getIfStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = IfStepSchema.extend({
    steps: z.array(stepSchema).min(1),
    else: z.array(stepSchema).optional(),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
};

export const ParallelStepSchema = BaseStepSchema.extend({
  type: z.literal('parallel'),
  branches: z.array(
    z.object({
      name: z.string(),
      steps: z.array(BaseStepSchema),
    })
  ),
});
export type ParallelStep = z.infer<typeof ParallelStepSchema>;

export const getParallelStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = ParallelStepSchema.extend({
    branches: z.array(z.object({ name: z.string(), steps: z.array(stepSchema) })),
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
};

export const MergeStepSchema = BaseStepSchema.extend({
  type: z.literal('merge'),
  sources: z.array(z.string()), // references to branches or steps to merge
  steps: z.array(BaseStepSchema), // steps to run after merge
});
export type MergeStep = z.infer<typeof MergeStepSchema>;

export const getMergeStepSchema = (stepSchema: z.ZodType, loose: boolean = false) => {
  const schema = MergeStepSchema.extend({
    steps: z.array(stepSchema), // steps to run after merge
  });

  if (loose) {
    // make all fields optional, but require type to be present for discriminated union
    return schema.partial().required({ type: true });
  }

  return schema;
};

/* --- Inputs --- */
export const WorkflowInputTypeEnum = z.enum(['string', 'number', 'boolean', 'choice', 'array']);

const WorkflowInputBaseSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  default: z.any().optional(),
  required: z.boolean().optional(),
});

export const WorkflowInputStringSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('string'),
  default: z.string().optional(),
});

export const WorkflowInputNumberSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('number'),
  default: z.number().optional(),
});

export const WorkflowInputBooleanSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('boolean'),
  default: z.boolean().optional(),
});

export const WorkflowInputChoiceSchema = WorkflowInputBaseSchema.extend({
  type: z.literal('choice'),
  default: z.string().optional(),
  options: z.array(z.string()),
});

export const WorkflowInputArraySchema = WorkflowInputBaseSchema.extend({
  type: z.literal('array'),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().nonnegative().optional(),
  default: z.union([z.array(z.string()), z.array(z.number()), z.array(z.boolean())]).optional(),
});

export const WorkflowInputSchema = z.union([
  WorkflowInputStringSchema,
  WorkflowInputNumberSchema,
  WorkflowInputBooleanSchema,
  WorkflowInputChoiceSchema,
  WorkflowInputArraySchema,
]);
export type LegacyWorkflowInput = z.infer<typeof WorkflowInputSchema>;

/* --- Consts --- */
export const WorkflowConstsSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.string(), z.any()),
    z.object({}),
    z.array(z.any()),
  ])
);

const StepSchema = z.lazy(() =>
  z.union([
    ForEachStepSchema,
    IfStepSchema,
    WaitStepSchema,
    DataSetStepSchema,
    HttpStepSchema,
    ElasticsearchStepSchema,
    KibanaStepSchema,
    ParallelStepSchema,
    MergeStepSchema,
    BaseConnectorStepSchema,
  ])
);
export type Step = z.infer<typeof StepSchema>;

export const BuiltInStepTypes = [
  ForEachStepSchema.shape.type.value,
  IfStepSchema.shape.type.value,
  ParallelStepSchema.shape.type.value,
  MergeStepSchema.shape.type.value,
  DataSetStepSchema.shape.type.value,
  WaitStepSchema.shape.type.value,
  HttpStepSchema.shape.type.value,
];
export type BuiltInStepType = (typeof BuiltInStepTypes)[number];

/* --- Workflow --- */
// Base schema without transform - can be extended (used in generate_yaml_schema_from_connectors.ts)
const WorkflowSchemaBase = z.object({
  version: z.literal('1').optional().default('1').describe('The version of the workflow schema'),
  name: z.string().min(1),
  description: z.string().optional(),
  settings: WorkflowSettingsSchema.optional(),
  enabled: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  triggers: z.array(TriggerSchema).min(1),
  inputs: z
    .union([
      // New JSON Schema format
      JsonModelSchema,
      // Legacy array format (for backward compatibility)
      z.array(WorkflowInputSchema),
    ])
    .optional(),
  consts: WorkflowConstsSchema.optional(),
  steps: z.array(StepSchema).min(1),
});

export const WorkflowSchema = WorkflowSchemaBase.transform((data) => {
  // Transform inputs from legacy array format to JSON Schema format
  let normalizedInputs: z.infer<typeof JsonModelSchema> | undefined;
  if (data.inputs) {
    if (
      'properties' in data.inputs &&
      typeof data.inputs === 'object' &&
      !Array.isArray(data.inputs)
    ) {
      normalizedInputs = data.inputs as z.infer<typeof JsonModelSchema>;
    } else if (Array.isArray(data.inputs)) {
      normalizedInputs = convertLegacyInputsToJsonSchema(data.inputs);
    }
  }

  // Return the data with normalized inputs, preserving all other fields as-is
  // This preserves the optionality of fields since we're not explicitly listing them all
  // Exclude inputs from spread to ensure it's always the normalized JSON Schema format (or undefined)
  const { inputs: _, ...rest } = data;
  return {
    ...rest,
    ...(normalizedInputs !== undefined && { inputs: normalizedInputs }),
  };
});

// Export base schema for extension (used in generate_yaml_schema_from_connectors.ts)
export { WorkflowSchemaBase };

export type WorkflowYaml = z.infer<typeof WorkflowSchema>;

// Schema is required for autocomplete because WorkflowGraph and WorkflowDefinition use it to build the autocomplete context.
// The schema captures all possible fields and passes them through for consumption by WorkflowGraph.
// We build this from the base object schema (before the pipe) to avoid issues with .partial() on piped schemas
// Base schema without transform - can be extended
const WorkflowSchemaForAutocompleteBase = z
  .object({
    version: z.literal('1').optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    settings: WorkflowSettingsSchema.optional(),
    enabled: z.boolean().default(true).optional(),
    tags: z.array(z.string()).optional(),
    triggers: z
      .array(z.object({ type: z.string().catch('') }).passthrough())
      .catch([])
      .default([]),
    inputs: z
      .union([
        // New JSON Schema format
        JsonModelSchema,
        // Legacy array format (for backward compatibility during parsing)
        z.array(
          z
            .object({
              name: z.string().catch(''),
              type: z.string().catch(''),
            })
            .passthrough()
        ),
      ])
      .optional()
      .catch(undefined),
    consts: WorkflowConstsSchema.optional(),
    steps: z
      .array(
        z
          .object({
            type: z.string().catch(''),
            name: z.string().catch(''),
          })
          .passthrough()
      )
      .catch([])
      .default([]),
  })
  .passthrough();

// Final schema with transform - ensure version default is applied
export const WorkflowSchemaForAutocomplete = WorkflowSchemaForAutocompleteBase.transform(
  (data) => ({
    ...data,
    version: data.version ?? '1',
  })
);

// Export base schema for extension (used in generate_yaml_schema_from_connectors.ts)
export { WorkflowSchemaForAutocompleteBase };

export const WorkflowExecutionContextSchema = z.object({
  id: z.string(),
  isTestRun: z.boolean(),
  startedAt: z.date(),
  url: z.string(),
  executedBy: z.string().optional(),
  triggeredBy: z.string().optional(),
});
export type WorkflowExecutionContext = z.infer<typeof WorkflowExecutionContextSchema>;

export const WorkflowDataContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  spaceId: z.string(),
});
export type WorkflowDataContext = z.infer<typeof WorkflowDataContextSchema>;

// Note: AlertSchema from '@kbn/alerts-as-data-utils' uses io-ts runtime types, not Zod.
// Once a Zod-compatible version is available, we should import and use it instead.
const AlertSchema = z.object({
  _id: z.string(),
  _index: z.string(),
  kibana: z.object({
    alert: z.any(),
  }),
  '@timestamp': z.string(),
});

const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  consumer: z.string(),
  producer: z.string(),
  ruleTypeId: z.string(),
});

export const EventSchema = z.object({
  alerts: z.array(z.union([AlertSchema, z.any()])),
  rule: RuleSchema,
  spaceId: z.string(),
  params: z.any(),
});

// Recursive type for workflow inputs that supports nested objects from JSON Schema
const WorkflowInputValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
    z.array(z.boolean()),
    z.record(z.string(), WorkflowInputValueSchema),
  ])
);

export const WorkflowContextSchema = z.object({
  event: EventSchema.optional(),
  execution: WorkflowExecutionContextSchema,
  workflow: WorkflowDataContextSchema,
  kibanaUrl: z.string(),
  inputs: z.record(z.string(), WorkflowInputValueSchema).optional(),
  consts: z.record(z.string(), z.any()).optional(),
  now: z.date().optional(),
});
export type WorkflowContext = z.infer<typeof WorkflowContextSchema>;

export const DynamicWorkflowContextSchema = WorkflowContextSchema.extend({
  // overriding record with object to avoid type mismatch when
  // extending with actual inputs and consts of different types
  inputs: z.object({}),
  consts: z.object({}),
});
export type DynamicWorkflowContext = z.infer<typeof DynamicWorkflowContextSchema>;

export const StepDataSchema = z.object({
  output: z.any().optional(),
  error: z.any().optional(),
});
export type StepData = z.infer<typeof StepDataSchema>;

const ForEachContextItemSchema = z.unknown();
export const ForEachContextSchema = z.object({
  items: z.array(ForEachContextItemSchema),
  index: z.number().int(),
  item: ForEachContextItemSchema,
  total: z.number().int(),
});
export type ForEachContext = z.infer<typeof ForEachContextSchema>;

export const StepContextSchema = WorkflowContextSchema.extend({
  steps: z.record(z.string(), StepDataSchema),
  foreach: ForEachContextSchema.optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
});
export type StepContext = z.infer<typeof StepContextSchema>;

export const DynamicStepContextSchema = DynamicWorkflowContextSchema.extend({
  // overriding record with object to avoid type mismatch when
  // extending with actual step ids and different output types
  steps: z.object({}),
});
export type DynamicStepContext = z.infer<typeof DynamicStepContextSchema>;

export const BaseSerializedErrorSchema = z.object({
  type: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type SerializedError = z.infer<typeof BaseSerializedErrorSchema>;
