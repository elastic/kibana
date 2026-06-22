/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

/**
 * We are still working on this type, it will arrive soon.
 * If it's critical for you, please open an issue.
 * https://github.com/elastic/elasticsearch-specification
 */
export const TODO = z.record(z.string(), z.any())
export type TODO = z.infer<typeof TODO>

export const AcknowledgedResponseBase = z.object({
  acknowledged: z.boolean().describe('For a successful response, this value is always true. On failure, an exception is returned instead.')
}).meta({ id: 'AcknowledgedResponseBase' })
export type AcknowledgedResponseBase = z.infer<typeof AcknowledgedResponseBase>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const MlAppliesTo = z.enum(['actual', 'typical', 'diff_from_typical', 'time']).meta({ id: 'MlAppliesTo' })
export type MlAppliesTo = z.infer<typeof MlAppliesTo>

export const MlConditionOperator = z.enum(['gt', 'gte', 'lt', 'lte']).meta({ id: 'MlConditionOperator' })
export type MlConditionOperator = z.infer<typeof MlConditionOperator>

export const MlRuleAction = z.enum(['skip_result', 'skip_model_update']).meta({ id: 'MlRuleAction' })
export type MlRuleAction = z.infer<typeof MlRuleAction>

export const MlRuleCondition = z.object({
  applies_to: MlAppliesTo.describe('Specifies the result property to which the condition applies. If your detector uses `lat_long`, `metric`, `rare`, or `freq_rare` functions, you can only specify conditions that apply to time.'),
  operator: MlConditionOperator.describe('Specifies the condition operator. The available options are greater than, greater than or equals, less than, and less than or equals.'),
  value: double.describe('The value that is compared against the `applies_to` field using the operator.')
}).meta({ id: 'MlRuleCondition' })
export type MlRuleCondition = z.infer<typeof MlRuleCondition>

export const MlFilterType = z.enum(['include', 'exclude']).meta({ id: 'MlFilterType' })
export type MlFilterType = z.infer<typeof MlFilterType>

export const MlFilterRef = z.object({
  filter_id: Id.describe('The identifier for the filter.'),
  filter_type: MlFilterType.describe('If set to `include`, the rule applies for values in the filter. If set to `exclude`, the rule applies for values not in the filter.').optional()
}).meta({ id: 'MlFilterRef' })
export type MlFilterRef = z.infer<typeof MlFilterRef>

export const MlDetectionRule = z.object({
  actions: z.array(MlRuleAction).describe('The set of actions to be triggered when the rule applies. If more than one action is specified the effects of all actions are combined.').optional(),
  conditions: z.array(MlRuleCondition).describe('An array of numeric conditions when the rule applies. A rule must either have a non-empty scope or at least one condition. Multiple conditions are combined together with a logical AND.').optional(),
  scope: z.record(Field, MlFilterRef).describe('A scope of series where the rule applies. A rule must either have a non-empty scope or at least one condition. By default, the scope includes all series. Scoping is allowed for any of the fields that are also specified in `by_field_name`, `over_field_name`, or `partition_field_name`.').optional()
}).meta({ id: 'MlDetectionRule' })
export type MlDetectionRule = z.infer<typeof MlDetectionRule>

export const MlExcludeFrequent = z.enum(['all', 'none', 'by', 'over']).meta({ id: 'MlExcludeFrequent' })
export type MlExcludeFrequent = z.infer<typeof MlExcludeFrequent>

export const MlDetector = z.object({
  by_field_name: Field.describe('The field used to split the data. In particular, this property is used for analyzing the splits with respect to their own history. It is used for finding unusual values in the context of the split.').optional(),
  custom_rules: z.array(MlDetectionRule).describe('Custom rules enable you to customize the way detectors operate. For example, a rule may dictate conditions under which results should be skipped. Kibana refers to custom rules as job rules.').optional(),
  detector_description: z.string().describe('A description of the detector.').optional(),
  detector_index: integer.describe('A unique identifier for the detector. This identifier is based on the order of the detectors in the `analysis_config`, starting at zero. If you specify a value for this property, it is ignored.').optional(),
  exclude_frequent: MlExcludeFrequent.describe('If set, frequent entities are excluded from influencing the anomaly results. Entities can be considered frequent over time or frequent in a population. If you are working with both over and by fields, you can set `exclude_frequent` to `all` for both fields, or to `by` or `over` for those specific fields.').optional(),
  field_name: Field.describe('The field that the detector uses in the function. If you use an event rate function such as count or rare, do not specify this field. The `field_name` cannot contain double quotes or backslashes.').optional(),
  function: z.string().describe('The analysis function that is used. For example, `count`, `rare`, `mean`, `min`, `max`, or `sum`.').optional(),
  over_field_name: Field.describe('The field used to split the data. In particular, this property is used for analyzing the splits with respect to the history of all splits. It is used for finding unusual values in the population of all splits.').optional(),
  partition_field_name: Field.describe('The field used to segment the analysis. When you use this property, you have completely independent baselines for each value of this field.').optional(),
  use_null: z.boolean().describe('Defines whether a new series is used as the null series when there is no value for the by or partition fields.').optional()
}).meta({ id: 'MlDetector' })
export type MlDetector = z.infer<typeof MlDetector>

/** Validate an anomaly detection job. */
export const MlValidateDetectorRequest = z.object({
  ...RequestBase.shape,
  detector: MlDetector.meta({ found_in: 'body' })
}).meta({ id: 'MlValidateDetectorRequest' })
export type MlValidateDetectorRequest = z.infer<typeof MlValidateDetectorRequest>

export const MlValidateDetectorResponse = AcknowledgedResponseBase.meta({ id: 'MlValidateDetectorResponse' })
export type MlValidateDetectorResponse = z.infer<typeof MlValidateDetectorResponse>
