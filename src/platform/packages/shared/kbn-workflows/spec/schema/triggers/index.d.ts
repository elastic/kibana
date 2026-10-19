/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
export { AlertRuleTriggerSchema } from './alert_trigger_schema';
export { ManualTriggerSchema } from './manual_trigger_schema';
export {
  ScheduledTriggerSchema,
  SCHEDULED_INTERVAL_ERROR,
  SCHEDULED_INTERVAL_PATTERN,
} from './scheduled_trigger_schema';
export declare const TriggerSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        type: z.ZodLiteral<'alert'>;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'scheduled'>;
        with: z.ZodUnion<
          readonly [
            z.ZodObject<
              {
                every: z.ZodString;
              },
              z.core.$strip
            >,
            z.ZodObject<
              {
                rrule: z.ZodObject<
                  {
                    freq: z.ZodEnum<{
                      DAILY: 'DAILY';
                      MONTHLY: 'MONTHLY';
                      WEEKLY: 'WEEKLY';
                    }>;
                    interval: z.ZodNumber;
                    tzid: z.ZodDefault<
                      z.ZodOptional<
                        z.ZodEnum<{
                          [x: string]: string;
                        }>
                      >
                    >;
                    dtstart: z.ZodOptional<z.ZodString>;
                    byhour: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                    byminute: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                    byweekday: z.ZodOptional<
                      z.ZodArray<
                        z.ZodEnum<{
                          FR: 'FR';
                          MO: 'MO';
                          SA: 'SA';
                          SU: 'SU';
                          TH: 'TH';
                          TU: 'TU';
                          WE: 'WE';
                        }>
                      >
                    >;
                    bymonthday: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                  },
                  z.core.$strip
                >;
              },
              z.core.$strip
            >
          ]
        >;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<'manual'>;
        inputs: z.ZodOptional<
          z.ZodUnion<
            readonly [
              z.ZodObject<
                {
                  type: z.ZodOptional<z.ZodLiteral<'object'>>;
                  title: z.ZodOptional<z.ZodString>;
                  description: z.ZodOptional<z.ZodString>;
                  $ref:
                    | z.ZodOptional<z.ZodString>
                    | z.ZodOptional<
                        z.ZodUnion<
                          readonly [
                            z.ZodEnum<{
                              [x: string]: string;
                            }>,
                            z.ZodString
                          ]
                        >
                      >;
                  properties: z.ZodOptional<
                    z.ZodRecord<
                      z.ZodString,
                      z.ZodType<
                        import('../common/json_model_shape_schema').JsonSchema,
                        unknown,
                        z.core.$ZodTypeInternals<
                          import('../common/json_model_shape_schema').JsonSchema,
                          unknown
                        >
                      >
                    >
                  >;
                  additionalProperties: z.ZodOptional<
                    z.ZodUnion<
                      readonly [
                        z.ZodBoolean,
                        z.ZodType<
                          import('../common/json_model_shape_schema').JsonSchema,
                          unknown,
                          z.core.$ZodTypeInternals<
                            import('../common/json_model_shape_schema').JsonSchema,
                            unknown
                          >
                        >
                      ]
                    >
                  >;
                  required: z.ZodOptional<z.ZodArray<z.ZodString>>;
                  definitions: z.ZodOptional<
                    z.ZodRecord<
                      z.ZodString,
                      z.ZodType<
                        import('../common/json_model_shape_schema').JsonSchema,
                        unknown,
                        z.core.$ZodTypeInternals<
                          import('../common/json_model_shape_schema').JsonSchema,
                          unknown
                        >
                      >
                    >
                  >;
                  $defs: z.ZodOptional<
                    z.ZodRecord<
                      z.ZodString,
                      z.ZodType<
                        import('../common/json_model_shape_schema').JsonSchema,
                        unknown,
                        z.core.$ZodTypeInternals<
                          import('../common/json_model_shape_schema').JsonSchema,
                          unknown
                        >
                      >
                    >
                  >;
                },
                z.core.$strip
              >,
              z.ZodArray<
                z.ZodUnion<
                  readonly [
                    z.ZodObject<
                      {
                        name: z.ZodString;
                        description: z.ZodOptional<z.ZodString>;
                        required: z.ZodOptional<z.ZodBoolean>;
                        type: z.ZodLiteral<'string'>;
                        default: z.ZodOptional<z.ZodString>;
                      },
                      z.core.$strip
                    >,
                    z.ZodObject<
                      {
                        name: z.ZodString;
                        description: z.ZodOptional<z.ZodString>;
                        required: z.ZodOptional<z.ZodBoolean>;
                        type: z.ZodLiteral<'number'>;
                        default: z.ZodOptional<z.ZodNumber>;
                      },
                      z.core.$strip
                    >,
                    z.ZodObject<
                      {
                        name: z.ZodString;
                        description: z.ZodOptional<z.ZodString>;
                        required: z.ZodOptional<z.ZodBoolean>;
                        type: z.ZodLiteral<'boolean'>;
                        default: z.ZodOptional<z.ZodBoolean>;
                      },
                      z.core.$strip
                    >,
                    z.ZodObject<
                      {
                        name: z.ZodString;
                        description: z.ZodOptional<z.ZodString>;
                        required: z.ZodOptional<z.ZodBoolean>;
                        type: z.ZodLiteral<'choice'>;
                        default: z.ZodOptional<z.ZodString>;
                        options: z.ZodArray<z.ZodString>;
                      },
                      z.core.$strip
                    >,
                    z.ZodObject<
                      {
                        name: z.ZodString;
                        description: z.ZodOptional<z.ZodString>;
                        required: z.ZodOptional<z.ZodBoolean>;
                        type: z.ZodLiteral<'array'>;
                        minItems: z.ZodOptional<z.ZodNumber>;
                        maxItems: z.ZodOptional<z.ZodNumber>;
                        default: z.ZodOptional<
                          z.ZodUnion<
                            readonly [
                              z.ZodArray<z.ZodString>,
                              z.ZodArray<z.ZodNumber>,
                              z.ZodArray<z.ZodBoolean>
                            ]
                          >
                        >;
                      },
                      z.core.$strip
                    >
                  ]
                >
              >
            ]
          >
        >;
      },
      z.core.$strip
    >
  ],
  'type'
>;
export type Trigger = z.infer<typeof TriggerSchema>;
/** Allowed values for `on.workflowEvents` on custom (event-driven) triggers. */
declare const WORKFLOW_EVENTS_VALUES: readonly ['ignore', 'allow-all', 'avoid-loop'];
export type WorkflowEventsValue = (typeof WORKFLOW_EVENTS_VALUES)[number];
export declare const WORKFLOW_EVENTS_VALUES_SET: Set<string>;
export declare const WorkflowEventsSchema: z.ZodEnum<{
  'allow-all': 'allow-all';
  'avoid-loop': 'avoid-loop';
  ignore: 'ignore';
}>;
/** Schema for the `on` block of custom triggers (KQL condition to filter when the workflow runs). */
declare const CustomTriggerOnObjectSchema: z.ZodObject<
  {
    condition: z.ZodOptional<z.ZodString>;
    workflowEvents: z.ZodOptional<
      z.ZodEnum<{
        'allow-all': 'allow-all';
        'avoid-loop': 'avoid-loop';
        ignore: 'ignore';
      }>
    >;
  },
  z.core.$strip
>;
export type CustomTriggerOn = z.infer<typeof CustomTriggerOnObjectSchema>;
declare const CustomTriggerShapeSchema: z.ZodObject<
  {
    type: z.ZodString;
    'connector-id': z.ZodOptional<z.ZodString>;
    on: z.ZodOptional<
      z.ZodObject<
        {
          condition: z.ZodOptional<z.ZodString>;
          workflowEvents: z.ZodOptional<
            z.ZodEnum<{
              'allow-all': 'allow-all';
              'avoid-loop': 'avoid-loop';
              ignore: 'ignore';
            }>
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
/**
 * Runtime YAML shape for a registered (non-built-in) trigger.
 * `connector-id` is required in the Zod schema when `requiresConnectorId` is set.
 */
export type CustomTrigger = z.infer<typeof CustomTriggerShapeSchema>;
export interface CustomTriggerSchemaConfig {
  id: string;
  requiresConnectorId?: boolean;
}
export type CustomTriggerSchemaInput = string | CustomTriggerSchemaConfig;
/**
 * Maps registered trigger definitions to the YAML schema input shape.
 * Duplicate ids keep the last `requiresConnectorId` value.
 */
export declare const toCustomTriggerSchemaConfigs: (
  triggers: Array<{
    id: string;
    requiresConnectorId?: boolean;
  }>
) => CustomTriggerSchemaConfig[];
/**
 * YAML Zod schema for a registered (non-built-in) trigger.
 */
export declare const getCustomTriggerZodSchema: ({
  id,
  requiresConnectorId,
}: CustomTriggerSchemaConfig) => z.ZodObject<
  {
    type: z.ZodLiteral<string>;
    on: z.ZodOptional<
      z.ZodObject<
        {
          condition: z.ZodOptional<z.ZodString>;
          workflowEvents: z.ZodOptional<
            z.ZodEnum<{
              'allow-all': 'allow-all';
              'avoid-loop': 'avoid-loop';
              ignore: 'ignore';
            }>
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
/**
 * Returns a trigger schema that includes built-in types plus optional registered trigger ids.
 * Used by the YAML editor so custom trigger types (e.g. example.custom_trigger) pass validation.
 * Custom triggers allow an `on.condition` clause for KQL filtering.
 * Pass `{ id, requiresConnectorId: true }` to require a non-empty `connector-id`;
 * a plain string id stays `{ type, on? }` (e.g. `getTriggerSchema(['cases.updated'])`).
 */
export declare function getTriggerSchema(customTriggers?: CustomTriggerSchemaInput[]): z.ZodType;
export declare const TriggerTypes: ('alert' | 'manual' | 'scheduled')[];
export type TriggerType = (typeof TriggerTypes)[number];
