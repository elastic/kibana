/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ScriptField } from './_global.search'
import { AcknowledgedResponseBase, ByteSize, CategoryId, DateTime, Duration, DurationValue, EpochTime, ExpandWildcards, Field, GrokPattern, HttpHeaders, Id, Ids, IndexName, Indices, IndicesOptions, Metadata, Name, Names, NodeId, NodeIds, NodeStatistics, Percentage, RequestBase, ScalarValue, TaskId, TransportAddress, VersionString, double, float, integer, long, ulong } from './_types'
import { AggregationsAggregationContainer } from './_types.aggregations'
import { AnalysisCharFilter, AnalysisTokenFilter, AnalysisTokenizer } from './_types.analysis'
import { MappingRuntimeFields } from './_types.mapping'
import { QueryDslQueryContainer } from './_types.query_dsl'

export const MlRegressionInferenceOptions = z.object({
  results_field: Field.describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  num_top_feature_importance_values: integer.describe('Specifies the maximum number of feature importance values per document.').optional()
}).meta({ id: 'MlRegressionInferenceOptions' })
export type MlRegressionInferenceOptions = z.infer<typeof MlRegressionInferenceOptions>

export const MlClassificationInferenceOptions = z.object({
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  num_top_feature_importance_values: integer.describe('Specifies the maximum number of feature importance values per document.').optional(),
  prediction_field_type: z.string().describe('Specifies the type of the predicted field to write. Acceptable values are: string, number, boolean. When boolean is provided 1.0 is transformed to true and 0.0 to false.').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  top_classes_results_field: z.string().describe('Specifies the field to which the top classes are written. Defaults to top_classes.').optional()
}).meta({ id: 'MlClassificationInferenceOptions' })
export type MlClassificationInferenceOptions = z.infer<typeof MlClassificationInferenceOptions>

export const MlDatafeedState = z.enum(['started', 'stopped', 'starting', 'stopping']).meta({ id: 'MlDatafeedState' })
export type MlDatafeedState = z.infer<typeof MlDatafeedState>

export const MlJobState = z.enum(['closing', 'closed', 'opened', 'failed', 'opening']).meta({ id: 'MlJobState' })
export type MlJobState = z.infer<typeof MlJobState>

export const MlMemoryStatus = z.enum(['ok', 'soft_limit', 'hard_limit']).meta({ id: 'MlMemoryStatus' })
export type MlMemoryStatus = z.infer<typeof MlMemoryStatus>

export const MlCategorizationStatus = z.enum(['ok', 'warn']).meta({ id: 'MlCategorizationStatus' })
export type MlCategorizationStatus = z.infer<typeof MlCategorizationStatus>

export const MlAdaptiveAllocationsSettings = z.object({
  enabled: z.boolean().describe('If true, adaptive_allocations is enabled'),
  min_number_of_allocations: integer.describe('Specifies the minimum number of allocations to scale to. If set, it must be greater than or equal to 0. If not defined, the deployment scales to 0.').optional(),
  max_number_of_allocations: integer.describe('Specifies the maximum number of allocations to scale to. If set, it must be greater than or equal to min_number_of_allocations.').optional()
}).meta({ id: 'MlAdaptiveAllocationsSettings' })
export type MlAdaptiveAllocationsSettings = z.infer<typeof MlAdaptiveAllocationsSettings>

export const MlCategorizationAnalyzerDefinition = z.object({
  char_filter: z.array(z.lazy(() => AnalysisCharFilter)).describe('One or more character filters. In addition to the built-in character filters, other plugins can provide more character filters. If this property is not specified, no character filters are applied prior to categorization. If you are customizing some other aspect of the analyzer and you need to achieve the equivalent of `categorization_filters` (which are not permitted when some other aspect of the analyzer is customized), add them here as pattern replace character filters.').optional(),
  filter: z.array(z.lazy(() => AnalysisTokenFilter)).describe('One or more token filters. In addition to the built-in token filters, other plugins can provide more token filters. If this property is not specified, no token filters are applied prior to categorization.').optional(),
  tokenizer: z.lazy(() => AnalysisTokenizer).describe('The name or definition of the tokenizer to use after character filters are applied. This property is compulsory if `categorization_analyzer` is specified as an object. Machine learning provides a tokenizer called `ml_standard` that tokenizes in a way that has been determined to produce good categorization results on a variety of log file formats for logs in English. If you want to use that tokenizer but change the character or token filters, specify "tokenizer": "ml_standard" in your `categorization_analyzer`. Additionally, the `ml_classic` tokenizer is available, which tokenizes in the same way as the non-customizable tokenizer in old versions of the product (before 6.2). `ml_classic` was the default categorization tokenizer in versions 6.2 to 7.13, so if you need categorization identical to the default for jobs created in these versions, specify "tokenizer": "ml_classic" in your `categorization_analyzer`.').optional()
}).meta({ id: 'MlCategorizationAnalyzerDefinition' })
export type MlCategorizationAnalyzerDefinition = z.infer<typeof MlCategorizationAnalyzerDefinition>

export const MlCategorizationAnalyzer = z.union([z.string(), MlCategorizationAnalyzerDefinition]).meta({ id: 'MlCategorizationAnalyzer' })
export type MlCategorizationAnalyzer = z.infer<typeof MlCategorizationAnalyzer>

export const MlRuleAction = z.enum(['skip_result', 'skip_model_update']).meta({ id: 'MlRuleAction' })
export type MlRuleAction = z.infer<typeof MlRuleAction>

export const MlAppliesTo = z.enum(['actual', 'typical', 'diff_from_typical', 'time']).meta({ id: 'MlAppliesTo' })
export type MlAppliesTo = z.infer<typeof MlAppliesTo>

export const MlConditionOperator = z.enum(['gt', 'gte', 'lt', 'lte']).meta({ id: 'MlConditionOperator' })
export type MlConditionOperator = z.infer<typeof MlConditionOperator>

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

export const MlPerPartitionCategorization = z.object({
  enabled: z.boolean().describe('To enable this setting, you must also set the `partition_field_name` property to the same value in every detector that uses the keyword `mlcategory`. Otherwise, job creation fails.').optional(),
  stop_on_warn: z.boolean().describe('This setting can be set to true only if per-partition categorization is enabled. If true, both categorization and subsequent anomaly detection stops for partitions where the categorization status changes to warn. This setting makes it viable to have a job where it is expected that categorization works well for some partitions but not others; you do not pay the cost of bad categorization forever in the partitions where it works badly.').optional()
}).meta({ id: 'MlPerPartitionCategorization' })
export type MlPerPartitionCategorization = z.infer<typeof MlPerPartitionCategorization>

export const MlAnalysisConfig = z.object({
  bucket_span: Duration.describe('The size of the interval that the analysis is aggregated into, typically between `5m` and `1h`. This value should be either a whole number of days or equate to a whole number of buckets in one day. If the anomaly detection job uses a datafeed with aggregations, this value must also be divisible by the interval of the date histogram aggregation.').optional(),
  categorization_analyzer: MlCategorizationAnalyzer.describe('If `categorization_field_name` is specified, you can also define the analyzer that is used to interpret the categorization field. This property cannot be used at the same time as `categorization_filters`. The categorization analyzer specifies how the `categorization_field` is interpreted by the categorization process. The `categorization_analyzer` field can be specified either as a string or as an object. If it is a string, it must refer to a built-in analyzer or one added by another plugin.').optional(),
  categorization_field_name: Field.describe('If this property is specified, the values of the specified field will be categorized. The resulting categories must be used in a detector by setting `by_field_name`, `over_field_name`, or `partition_field_name` to the keyword `mlcategory`.').optional(),
  categorization_filters: z.array(z.string()).describe('If `categorization_field_name` is specified, you can also define optional filters. This property expects an array of regular expressions. The expressions are used to filter out matching sequences from the categorization field values. You can use this functionality to fine tune the categorization by excluding sequences from consideration when categories are defined. For example, you can exclude SQL statements that appear in your log files. This property cannot be used at the same time as `categorization_analyzer`. If you only want to define simple regular expression filters that are applied prior to tokenization, setting this property is the easiest method. If you also want to customize the tokenizer or post-tokenization filtering, use the `categorization_analyzer` property instead and include the filters as pattern_replace character filters. The effect is exactly the same.').optional(),
  detectors: z.array(MlDetector).describe('Detector configuration objects specify which data fields a job analyzes. They also specify which analytical functions are used. You can specify multiple detectors for a job. If the detectors array does not contain at least one detector, no analysis can occur and an error is returned.'),
  influencers: z.array(Field).describe('A comma separated list of influencer field names. Typically these can be the by, over, or partition fields that are used in the detector configuration. You might also want to use a field name that is not specifically named in a detector, but is available as part of the input data. When you use multiple detectors, the use of influencers is recommended as it aggregates results for each influencer entity.').optional(),
  latency: Duration.describe('The size of the window in which to expect data that is out of time order. If you specify a non-zero value, it must be greater than or equal to one second. NOTE: Latency is applicable only when you send data by using the post data API.').optional(),
  model_prune_window: Duration.describe('Advanced configuration option. Affects the pruning of models that have not been updated for the given time duration. The value must be set to a multiple of the `bucket_span`. If set too low, important information may be removed from the model. For jobs created in 8.1 and later, the default value is the greater of `30d` or 20 times `bucket_span`.').optional(),
  multivariate_by_fields: z.boolean().describe('This functionality is reserved for internal use. It is not supported for use in customer environments and is not subject to the support SLA of official GA features. If set to `true`, the analysis will automatically find correlations between metrics for a given by field value and report anomalies when those correlations cease to hold. For example, suppose CPU and memory usage on host A is usually highly correlated with the same metrics on host B. Perhaps this correlation occurs because they are running a load-balanced application. If you enable this property, anomalies will be reported when, for example, CPU usage on host A is high and the value of CPU usage on host B is low. That is to say, you’ll see an anomaly when the CPU of host A is unusual given the CPU of host B. To use the `multivariate_by_fields` property, you must also specify `by_field_name` in your detector.').optional(),
  per_partition_categorization: MlPerPartitionCategorization.describe('Settings related to how categorization interacts with partition fields.').optional(),
  summary_count_field_name: Field.describe('If this property is specified, the data that is fed to the job is expected to be pre-summarized. This property value is the name of the field that contains the count of raw data points that have been summarized. The same `summary_count_field_name` applies to all detectors in the job. NOTE: The `summary_count_field_name` property cannot be used with the `metric` function.').optional()
}).meta({ id: 'MlAnalysisConfig' })
export type MlAnalysisConfig = z.infer<typeof MlAnalysisConfig>

export const MlDetectorRead = z.object({
  function: z.string().describe('The analysis function that is used. For example, `count`, `rare`, `mean`, `min`, `max`, or `sum`.'),
  by_field_name: Field.describe('The field used to split the data. In particular, this property is used for analyzing the splits with respect to their own history. It is used for finding unusual values in the context of the split.').optional(),
  custom_rules: z.array(MlDetectionRule).describe('Custom rules enable you to customize the way detectors operate. For example, a rule may dictate conditions under which results should be skipped. Kibana refers to custom rules as job rules.').optional(),
  detector_description: z.string().describe('A description of the detector.').optional(),
  detector_index: integer.describe('A unique identifier for the detector. This identifier is based on the order of the detectors in the `analysis_config`, starting at zero. If you specify a value for this property, it is ignored.').optional(),
  exclude_frequent: MlExcludeFrequent.describe('If set, frequent entities are excluded from influencing the anomaly results. Entities can be considered frequent over time or frequent in a population. If you are working with both over and by fields, you can set `exclude_frequent` to `all` for both fields, or to `by` or `over` for those specific fields.').optional(),
  field_name: Field.describe('The field that the detector uses in the function. If you use an event rate function such as count or rare, do not specify this field. The `field_name` cannot contain double quotes or backslashes.').optional(),
  over_field_name: Field.describe('The field used to split the data. In particular, this property is used for analyzing the splits with respect to the history of all splits. It is used for finding unusual values in the population of all splits.').optional(),
  partition_field_name: Field.describe('The field used to segment the analysis. When you use this property, you have completely independent baselines for each value of this field.').optional(),
  use_null: z.boolean().describe('Defines whether a new series is used as the null series when there is no value for the by or partition fields.').optional()
}).meta({ id: 'MlDetectorRead' })
export type MlDetectorRead = z.infer<typeof MlDetectorRead>

export const MlAnalysisConfigRead = z.object({
  bucket_span: Duration.describe('The size of the interval that the analysis is aggregated into, typically between `5m` and `1h`. This value should be either a whole number of days or equate to a whole number of buckets in one day. If the anomaly detection job uses a datafeed with aggregations, this value must also be divisible by the interval of the date histogram aggregation.'),
  detectors: z.array(MlDetectorRead).describe('Detector configuration objects specify which data fields a job analyzes. They also specify which analytical functions are used. You can specify multiple detectors for a job. If the detectors array does not contain at least one detector, no analysis can occur and an error is returned.'),
  influencers: z.array(Field).describe('A comma separated list of influencer field names. Typically these can be the by, over, or partition fields that are used in the detector configuration. You might also want to use a field name that is not specifically named in a detector, but is available as part of the input data. When you use multiple detectors, the use of influencers is recommended as it aggregates results for each influencer entity.'),
  categorization_analyzer: MlCategorizationAnalyzer.describe('If `categorization_field_name` is specified, you can also define the analyzer that is used to interpret the categorization field. This property cannot be used at the same time as `categorization_filters`. The categorization analyzer specifies how the `categorization_field` is interpreted by the categorization process. The `categorization_analyzer` field can be specified either as a string or as an object. If it is a string, it must refer to a built-in analyzer or one added by another plugin.').optional(),
  categorization_field_name: Field.describe('If this property is specified, the values of the specified field will be categorized. The resulting categories must be used in a detector by setting `by_field_name`, `over_field_name`, or `partition_field_name` to the keyword `mlcategory`.').optional(),
  categorization_filters: z.array(z.string()).describe('If `categorization_field_name` is specified, you can also define optional filters. This property expects an array of regular expressions. The expressions are used to filter out matching sequences from the categorization field values. You can use this functionality to fine tune the categorization by excluding sequences from consideration when categories are defined. For example, you can exclude SQL statements that appear in your log files. This property cannot be used at the same time as `categorization_analyzer`. If you only want to define simple regular expression filters that are applied prior to tokenization, setting this property is the easiest method. If you also want to customize the tokenizer or post-tokenization filtering, use the `categorization_analyzer` property instead and include the filters as pattern_replace character filters. The effect is exactly the same.').optional(),
  latency: Duration.describe('The size of the window in which to expect data that is out of time order. If you specify a non-zero value, it must be greater than or equal to one second. NOTE: Latency is applicable only when you send data by using the post data API.').optional(),
  model_prune_window: Duration.describe('Advanced configuration option. Affects the pruning of models that have not been updated for the given time duration. The value must be set to a multiple of the `bucket_span`. If set too low, important information may be removed from the model. For jobs created in 8.1 and later, the default value is the greater of `30d` or 20 times `bucket_span`.').optional(),
  multivariate_by_fields: z.boolean().describe('This functionality is reserved for internal use. It is not supported for use in customer environments and is not subject to the support SLA of official GA features. If set to `true`, the analysis will automatically find correlations between metrics for a given by field value and report anomalies when those correlations cease to hold. For example, suppose CPU and memory usage on host A is usually highly correlated with the same metrics on host B. Perhaps this correlation occurs because they are running a load-balanced application. If you enable this property, anomalies will be reported when, for example, CPU usage on host A is high and the value of CPU usage on host B is low. That is to say, you’ll see an anomaly when the CPU of host A is unusual given the CPU of host B. To use the `multivariate_by_fields` property, you must also specify `by_field_name` in your detector.').optional(),
  per_partition_categorization: MlPerPartitionCategorization.describe('Settings related to how categorization interacts with partition fields.').optional(),
  summary_count_field_name: Field.describe('If this property is specified, the data that is fed to the job is expected to be pre-summarized. This property value is the name of the field that contains the count of raw data points that have been summarized. The same `summary_count_field_name` applies to all detectors in the job. NOTE: The `summary_count_field_name` property cannot be used with the `metric` function.').optional()
}).meta({ id: 'MlAnalysisConfigRead' })
export type MlAnalysisConfigRead = z.infer<typeof MlAnalysisConfigRead>

export const MlAnalysisLimits = z.object({
  categorization_examples_limit: long.describe('The maximum number of examples stored per category in memory and in the results data store. If you increase this value, more examples are available, however it requires that you have more storage available. If you set this value to 0, no examples are stored. NOTE: The `categorization_examples_limit` applies only to analysis that uses categorization.').optional(),
  model_memory_limit: ByteSize.describe('The approximate maximum amount of memory resources that are required for analytical processing. Once this limit is approached, data pruning becomes more aggressive. Upon exceeding this limit, new entities are not modeled. If the `xpack.ml.max_model_memory_limit` setting has a value greater than 0 and less than 1024mb, that value is used instead of the default. The default value is relatively small to ensure that high resource usage is a conscious decision. If you have jobs that are expected to analyze high cardinality fields, you will likely need to use a higher value. If you specify a number instead of a string, the units are assumed to be MiB. Specifying a string is recommended for clarity. If you specify a byte size unit of `b` or `kb` and the number does not equate to a discrete number of megabytes, it is rounded down to the closest MiB. The minimum valid value is 1 MiB. If you specify a value less than 1 MiB, an error occurs. If you specify a value for the `xpack.ml.max_model_memory_limit` setting, an error occurs when you try to create jobs that have `model_memory_limit` values greater than that setting value.').optional()
}).meta({ id: 'MlAnalysisLimits' })
export type MlAnalysisLimits = z.infer<typeof MlAnalysisLimits>

export const MlAnalysisMemoryLimit = z.object({
  model_memory_limit: z.string().describe('Limits can be applied for the resources required to hold the mathematical models in memory. These limits are approximate and can be set per job. They do not control the memory used by other processes, for example the Elasticsearch Java processes.')
}).meta({ id: 'MlAnalysisMemoryLimit' })
export type MlAnalysisMemoryLimit = z.infer<typeof MlAnalysisMemoryLimit>

export const MlAnomalyExplanation = z.object({
  anomaly_characteristics_impact: integer.describe('Impact from the duration and magnitude of the detected anomaly relative to the historical average.').optional(),
  anomaly_length: integer.describe('Length of the detected anomaly in the number of buckets.').optional(),
  anomaly_type: z.string().describe('Type of the detected anomaly: `spike` or `dip`.').optional(),
  high_variance_penalty: z.boolean().describe('Indicates reduction of anomaly score for the bucket with large confidence intervals. If a bucket has large confidence intervals, the score is reduced.').optional(),
  incomplete_bucket_penalty: z.boolean().describe('If the bucket contains fewer samples than expected, the score is reduced.').optional(),
  lower_confidence_bound: double.describe('Lower bound of the 95% confidence interval.').optional(),
  multi_bucket_impact: integer.describe('Impact of the deviation between actual and typical values in the past 12 buckets.').optional(),
  single_bucket_impact: integer.describe('Impact of the deviation between actual and typical values in the current bucket.').optional(),
  typical_value: double.describe('Typical (expected) value for this bucket.').optional(),
  upper_confidence_bound: double.describe('Upper bound of the 95% confidence interval.').optional()
}).meta({ id: 'MlAnomalyExplanation' })
export type MlAnomalyExplanation = z.infer<typeof MlAnomalyExplanation>

export const MlGeoResults = z.object({
  actual_point: z.string().describe('The actual value for the bucket formatted as a `geo_point`.').optional(),
  typical_point: z.string().describe('The typical value for the bucket formatted as a `geo_point`.').optional()
}).meta({ id: 'MlGeoResults' })
export type MlGeoResults = z.infer<typeof MlGeoResults>

export const MlInfluence = z.object({
  influencer_field_name: z.string(),
  influencer_field_values: z.array(z.string())
}).meta({ id: 'MlInfluence' })
export type MlInfluence = z.infer<typeof MlInfluence>

export const MlAnomalyCause = z.object({
  actual: z.array(double).optional(),
  by_field_name: Name.optional(),
  by_field_value: z.string().optional(),
  correlated_by_field_value: z.string().optional(),
  field_name: Field.optional(),
  function: z.string().optional(),
  function_description: z.string().optional(),
  geo_results: MlGeoResults.optional(),
  influencers: z.array(MlInfluence).optional(),
  over_field_name: Name.optional(),
  over_field_value: z.string().optional(),
  partition_field_name: z.string().optional(),
  partition_field_value: z.string().optional(),
  probability: double,
  typical: z.array(double).optional()
}).meta({ id: 'MlAnomalyCause' })
export type MlAnomalyCause = z.infer<typeof MlAnomalyCause>

export const MlAnomaly = z.object({
  actual: z.array(double).describe('The actual value for the bucket.').optional(),
  anomaly_score_explanation: MlAnomalyExplanation.describe('Information about the factors impacting the initial anomaly score.').optional(),
  bucket_span: DurationValue.describe('The length of the bucket in seconds. This value matches the `bucket_span` that is specified in the job.'),
  by_field_name: z.string().describe('The field used to split the data. In particular, this property is used for analyzing the splits with respect to their own history. It is used for finding unusual values in the context of the split.').optional(),
  by_field_value: z.string().describe('The value of `by_field_name`.').optional(),
  causes: z.array(MlAnomalyCause).describe('For population analysis, an over field must be specified in the detector. This property contains an array of anomaly records that are the causes for the anomaly that has been identified for the over field. This sub-resource contains the most anomalous records for the `over_field_name`. For scalability reasons, a maximum of the 10 most significant causes of the anomaly are returned. As part of the core analytical modeling, these low-level anomaly records are aggregated for their parent over field record. The `causes` resource contains similar elements to the record resource, namely `actual`, `typical`, `geo_results.actual_point`, `geo_results.typical_point`, `*_field_name` and `*_field_value`. Probability and scores are not applicable to causes.').optional(),
  detector_index: integer.describe('A unique identifier for the detector.'),
  field_name: z.string().describe('Certain functions require a field to operate on, for example, `sum()`. For those functions, this value is the name of the field to be analyzed.').optional(),
  function: z.string().describe('The function in which the anomaly occurs, as specified in the detector configuration. For example, `max`.').optional(),
  function_description: z.string().describe('The description of the function in which the anomaly occurs, as specified in the detector configuration.').optional(),
  geo_results: MlGeoResults.describe('If the detector function is `lat_long`, this object contains comma delimited strings for the latitude and longitude of the actual and typical values.').optional(),
  influencers: z.array(MlInfluence).describe('If influencers were specified in the detector configuration, this array contains influencers that contributed to or were to blame for an anomaly.').optional(),
  initial_record_score: double.describe('A normalized score between 0-100, which is based on the probability of the anomalousness of this record. This is the initial value that was calculated at the time the bucket was processed.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  job_id: z.string().describe('Identifier for the anomaly detection job.'),
  over_field_name: z.string().describe('The field used to split the data. In particular, this property is used for analyzing the splits with respect to the history of all splits. It is used for finding unusual values in the population of all splits.').optional(),
  over_field_value: z.string().describe('The value of `over_field_name`.').optional(),
  partition_field_name: z.string().describe('The field used to segment the analysis. When you use this property, you have completely independent baselines for each value of this field.').optional(),
  partition_field_value: z.string().describe('The value of `partition_field_name`.').optional(),
  probability: double.describe('The probability of the individual anomaly occurring, in the range 0 to 1. For example, `0.0000772031`. This value can be held to a high precision of over 300 decimal places, so the `record_score` is provided as a human-readable and friendly interpretation of this.'),
  record_score: double.describe('A normalized score between 0-100, which is based on the probability of the anomalousness of this record. Unlike `initial_record_score`, this value will be updated by a re-normalization process as new data is analyzed.'),
  result_type: z.string().describe('Internal. This is always set to `record`.'),
  timestamp: EpochTime.describe('The start time of the bucket for which these results were calculated.'),
  typical: z.array(double).describe('The typical value for the bucket, according to analytical modeling.').optional()
}).meta({ id: 'MlAnomaly' })
export type MlAnomaly = z.infer<typeof MlAnomaly>

export const MlApiKeyAuthorization = z.object({
  id: z.string().describe('The identifier for the API key.'),
  name: z.string().describe('The name of the API key.')
}).meta({ id: 'MlApiKeyAuthorization' })
export type MlApiKeyAuthorization = z.infer<typeof MlApiKeyAuthorization>

export const MlBucketInfluencer = z.object({
  anomaly_score: double.describe('A normalized score between 0-100, which is calculated for each bucket influencer. This score might be updated as newer data is analyzed.'),
  bucket_span: DurationValue.describe('The length of the bucket in seconds. This value matches the bucket span that is specified in the job.'),
  influencer_field_name: Field.describe('The field name of the influencer.'),
  initial_anomaly_score: double.describe('The score between 0-100 for each bucket influencer. This score is the initial value that was calculated at the time the bucket was processed.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  probability: double.describe('The probability that the bucket has this behavior, in the range 0 to 1. This value can be held to a high precision of over 300 decimal places, so the `anomaly_score` is provided as a human-readable and friendly interpretation of this.'),
  raw_anomaly_score: double.describe('Internal.'),
  result_type: z.string().describe('Internal. This value is always set to `bucket_influencer`.'),
  timestamp: EpochTime.describe('The start time of the bucket for which these results were calculated.'),
  timestamp_string: DateTime.describe('The start time of the bucket for which these results were calculated.').optional()
}).meta({ id: 'MlBucketInfluencer' })
export type MlBucketInfluencer = z.infer<typeof MlBucketInfluencer>

export const MlBucketSummary = z.object({
  anomaly_score: double.describe('The maximum anomaly score, between 0-100, for any of the bucket influencers. This is an overall, rate-limited score for the job. All the anomaly records in the bucket contribute to this score. This value might be updated as new data is analyzed.'),
  bucket_influencers: z.array(MlBucketInfluencer),
  bucket_span: DurationValue.describe('The length of the bucket in seconds. This value matches the bucket span that is specified in the job.'),
  event_count: long.describe('The number of input data records processed in this bucket.'),
  initial_anomaly_score: double.describe('The maximum anomaly score for any of the bucket influencers. This is the initial value that was calculated at the time the bucket was processed.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  processing_time_ms: DurationValue.describe('The amount of time, in milliseconds, that it took to analyze the bucket contents and calculate results.'),
  result_type: z.string().describe('Internal. This value is always set to bucket.'),
  timestamp: EpochTime.describe('The start time of the bucket. This timestamp uniquely identifies the bucket. Events that occur exactly at the timestamp of the bucket are included in the results for the bucket.'),
  timestamp_string: DateTime.describe('The start time of the bucket. This timestamp uniquely identifies the bucket. Events that occur exactly at the timestamp of the bucket are included in the results for the bucket.').optional()
}).meta({ id: 'MlBucketSummary' })
export type MlBucketSummary = z.infer<typeof MlBucketSummary>

export const MlCalendarEvent = z.object({
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').optional(),
  event_id: Id.optional(),
  description: z.string().describe('A description of the scheduled event.'),
  end_time: DateTime.describe('The timestamp for the end of the scheduled event in milliseconds since the epoch or ISO 8601 format.'),
  start_time: DateTime.describe('The timestamp for the beginning of the scheduled event in milliseconds since the epoch or ISO 8601 format.'),
  skip_result: z.boolean().describe('When true the model will not create results for this calendar period.').optional(),
  skip_model_update: z.boolean().describe('When true the model will not be updated for this calendar period.').optional(),
  force_time_shift: integer.describe('Shift time by this many seconds. For example adjust time for daylight savings changes').optional()
}).meta({ id: 'MlCalendarEvent' })
export type MlCalendarEvent = z.infer<typeof MlCalendarEvent>

export const MlCategory = z.object({
  category_id: ulong.describe('A unique identifier for the category. category_id is unique at the job level, even when per-partition categorization is enabled.'),
  examples: z.array(z.string()).describe('A list of examples of actual values that matched the category.'),
  grok_pattern: GrokPattern.describe('[experimental] A Grok pattern that could be used in Logstash or an ingest pipeline to extract fields from messages that match the category. This field is experimental and may be changed or removed in a future release. The Grok patterns that are found are not optimal, but are often a good starting point for manual tweaking.').optional(),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  max_matching_length: ulong.describe('The maximum length of the fields that matched the category. The value is increased by 10% to enable matching for similar fields that have not been analyzed.'),
  partition_field_name: z.string().describe('If per-partition categorization is enabled, this property identifies the field used to segment the categorization. It is not present when per-partition categorization is disabled.').optional(),
  partition_field_value: z.string().describe('If per-partition categorization is enabled, this property identifies the value of the partition_field_name for the category. It is not present when per-partition categorization is disabled.').optional(),
  regex: z.string().describe('A regular expression that is used to search for values that match the category.'),
  terms: z.string().describe('A space separated list of the common tokens that are matched in values of the category.'),
  num_matches: long.describe('The number of messages that have been matched by this category. This is only guaranteed to have the latest accurate count after a job _flush or _close').optional(),
  preferred_to_categories: z.array(Id).describe('A list of category_id entries that this current category encompasses. Any new message that is processed by the categorizer will match against this category and not any of the categories in this list. This is only guaranteed to have the latest accurate list of categories after a job _flush or _close').optional(),
  p: z.string().optional(),
  result_type: z.string(),
  mlcategory: z.string()
}).meta({ id: 'MlCategory' })
export type MlCategory = z.infer<typeof MlCategory>

export const MlChunkingMode = z.enum(['auto', 'manual', 'off']).meta({ id: 'MlChunkingMode' })
export type MlChunkingMode = z.infer<typeof MlChunkingMode>

export const MlChunkingConfig = z.object({
  mode: MlChunkingMode.describe('If the mode is `auto`, the chunk size is dynamically calculated; this is the recommended value when the datafeed does not use aggregations. If the mode is `manual`, chunking is applied according to the specified `time_span`; use this mode when the datafeed uses aggregations. If the mode is `off`, no chunking is applied.'),
  time_span: Duration.describe('The time span that each search will be querying. This setting is applicable only when the `mode` is set to `manual`.').optional()
}).meta({ id: 'MlChunkingConfig' })
export type MlChunkingConfig = z.infer<typeof MlChunkingConfig>

export const MlTokenizationTruncate = z.enum(['first', 'second', 'none']).meta({ id: 'MlTokenizationTruncate' })
export type MlTokenizationTruncate = z.infer<typeof MlTokenizationTruncate>

export const MlCommonTokenizationConfig = z.object({
  do_lower_case: z.boolean().describe('Should the tokenizer lower case the text').optional(),
  max_sequence_length: integer.describe('Maximum input sequence length for the model').optional(),
  span: integer.describe('Tokenization spanning options. Special value of -1 indicates no spanning takes place').optional(),
  truncate: MlTokenizationTruncate.describe('Should tokenization input be automatically truncated before sending to the model for inference').optional(),
  with_special_tokens: z.boolean().describe('Is tokenization completed with special tokens').optional()
}).meta({ id: 'MlCommonTokenizationConfig' })
export type MlCommonTokenizationConfig = z.infer<typeof MlCommonTokenizationConfig>

/** Custom metadata about the job */
export const MlCustomSettings = z.any().meta({ id: 'MlCustomSettings' })
export type MlCustomSettings = z.infer<typeof MlCustomSettings>

export const MlDataCounts = z.object({
  bucket_count: long,
  earliest_record_timestamp: long.optional(),
  empty_bucket_count: long,
  input_bytes: long,
  input_field_count: long,
  input_record_count: long,
  invalid_date_count: long,
  job_id: Id,
  last_data_time: long.optional(),
  latest_empty_bucket_timestamp: long.optional(),
  latest_record_timestamp: long.optional(),
  latest_sparse_bucket_timestamp: long.optional(),
  latest_bucket_timestamp: long.optional(),
  log_time: long.optional(),
  missing_field_count: long,
  out_of_order_timestamp_count: long,
  processed_field_count: long,
  processed_record_count: long,
  sparse_bucket_count: long
}).meta({ id: 'MlDataCounts' })
export type MlDataCounts = z.infer<typeof MlDataCounts>

export const MlDataDescription = z.object({
  format: z.string().describe('Only JSON format is supported at this time.').optional(),
  time_field: Field.describe('The name of the field that contains the timestamp.').optional(),
  time_format: z.string().describe('The time format, which can be `epoch`, `epoch_ms`, or a custom pattern. The value `epoch` refers to UNIX or Epoch time (the number of seconds since 1 Jan 1970). The value `epoch_ms` indicates that time is measured in milliseconds since the epoch. The `epoch` and `epoch_ms` time formats accept either integer or real values. Custom patterns must conform to the Java DateTimeFormatter class. When you use date-time formatting patterns, it is recommended that you provide the full date, time and time zone. For example: `yyyy-MM-dd\'T\'HH:mm:ssX`. If the pattern that you specify is not sufficient to produce a complete timestamp, job creation fails.').optional(),
  field_delimiter: z.string().optional()
}).meta({ id: 'MlDataDescription' })
export type MlDataDescription = z.infer<typeof MlDataDescription>

export const MlDatafeedAuthorization = z.object({
  api_key: MlApiKeyAuthorization.describe('If an API key was used for the most recent update to the datafeed, its name and identifier are listed in the response.').optional(),
  roles: z.array(z.string()).describe('If a user ID was used for the most recent update to the datafeed, its roles at the time of the update are listed in the response.').optional(),
  service_account: z.string().describe('If a service account was used for the most recent update to the datafeed, the account name is listed in the response.').optional()
}).meta({ id: 'MlDatafeedAuthorization' })
export type MlDatafeedAuthorization = z.infer<typeof MlDatafeedAuthorization>

export const MlDelayedDataCheckConfig = z.object({
  check_window: Duration.describe('The window of time that is searched for late data. This window of time ends with the latest finalized bucket. It defaults to null, which causes an appropriate `check_window` to be calculated when the real-time datafeed runs. In particular, the default `check_window` span calculation is based on the maximum of `2h` or `8 * bucket_span`.').optional(),
  enabled: z.boolean().describe('Specifies whether the datafeed periodically checks for delayed data.')
}).meta({ id: 'MlDelayedDataCheckConfig' })
export type MlDelayedDataCheckConfig = z.infer<typeof MlDelayedDataCheckConfig>

export const MlDatafeed = z.object({
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).optional(),
  aggs: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).optional(),
  authorization: MlDatafeedAuthorization.describe('The security privileges that the datafeed uses to run its queries. If Elastic Stack security features were disabled at the time of the most recent update to the datafeed, this property is omitted.').optional(),
  chunking_config: MlChunkingConfig.optional(),
  datafeed_id: Id,
  frequency: Duration.describe('The interval at which scheduled queries are made while the datafeed runs in real time. The default value is either the bucket span for short bucket spans, or, for longer bucket spans, a sensible fraction of the bucket span. For example: `150s`. When `frequency` is shorter than the bucket span, interim results for the last (partial) bucket are written then eventually overwritten by the full bucket results. If the datafeed uses aggregations, this value must be divisible by the interval of the date histogram aggregation.').optional(),
  indices: z.array(z.string()),
  indexes: z.array(z.string()).optional(),
  job_id: Id,
  max_empty_searches: integer.optional(),
  query: z.lazy(() => QueryDslQueryContainer),
  query_delay: Duration.optional(),
  script_fields: z.record(z.string(), z.lazy(() => ScriptField)).optional(),
  scroll_size: integer.optional(),
  delayed_data_check_config: MlDelayedDataCheckConfig,
  runtime_mappings: z.lazy(() => MappingRuntimeFields).optional(),
  indices_options: IndicesOptions.optional()
}).meta({ id: 'MlDatafeed' })
export type MlDatafeed = z.infer<typeof MlDatafeed>

export const MlDatafeedConfig = z.object({
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('If set, the datafeed performs aggregation searches. Support for aggregations is limited and should be used only with low cardinality data.').optional(),
  aggs: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('If set, the datafeed performs aggregation searches. Support for aggregations is limited and should be used only with low cardinality data.').optional(),
  chunking_config: MlChunkingConfig.describe('Datafeeds might be required to search over long time periods, for several months or years. This search is split into time chunks in order to ensure the load on Elasticsearch is managed. Chunking configuration controls how the size of these time chunks are calculated and is an advanced configuration option.').optional(),
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters. The default value is the job identifier.').optional(),
  delayed_data_check_config: MlDelayedDataCheckConfig.describe('Specifies whether the datafeed checks for missing data and the size of the window. The datafeed can optionally search over indices that have already been read in an effort to determine whether any data has subsequently been added to the index. If missing data is found, it is a good indication that the `query_delay` option is set too low and the data is being indexed after the datafeed has passed that moment in time. This check runs only on real-time datafeeds.').optional(),
  frequency: Duration.describe('The interval at which scheduled queries are made while the datafeed runs in real time. The default value is either the bucket span for short bucket spans, or, for longer bucket spans, a sensible fraction of the bucket span. For example: `150s`. When `frequency` is shorter than the bucket span, interim results for the last (partial) bucket are written then eventually overwritten by the full bucket results. If the datafeed uses aggregations, this value must be divisible by the interval of the date histogram aggregation.').optional(),
  indices: Indices.describe('An array of index names. Wildcards are supported. If any indices are in remote clusters, the machine learning nodes must have the `remote_cluster_client` role.').optional(),
  indexes: Indices.describe('An array of index names. Wildcards are supported. If any indices are in remote clusters, the machine learning nodes must have the `remote_cluster_client` role.').optional(),
  indices_options: IndicesOptions.describe('Specifies index expansion options that are used during search.').optional(),
  job_id: Id.optional(),
  max_empty_searches: integer.describe('If a real-time datafeed has never seen any data (including during any initial training period) then it will automatically stop itself and close its associated job after this many real-time searches that return no documents. In other words, it will stop after `frequency` times `max_empty_searches` of real-time operation. If not set then a datafeed with no end time that sees no data will remain started until it is explicitly stopped.').optional(),
  query: z.lazy(() => QueryDslQueryContainer).describe('The Elasticsearch query domain-specific language (DSL). This value corresponds to the query object in an Elasticsearch search POST body. All the options that are supported by Elasticsearch can be used, as this object is passed verbatim to Elasticsearch.').optional(),
  query_delay: Duration.describe('The number of seconds behind real time that data is queried. For example, if data from 10:04 a.m. might not be searchable in Elasticsearch until 10:06 a.m., set this property to 120 seconds. The default value is randomly selected between `60s` and `120s`. This randomness improves the query performance when there are multiple jobs running on the same node.').optional(),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('Specifies runtime fields for the datafeed search.').optional(),
  script_fields: z.record(z.string(), z.lazy(() => ScriptField)).describe('Specifies scripts that evaluate custom expressions and returns script fields to the datafeed. The detector configuration objects in a job can contain functions that use these script fields.').optional(),
  scroll_size: integer.describe('The size parameter that is used in Elasticsearch searches when the datafeed does not use aggregations. The maximum value is the value of `index.max_result_window`, which is 10,000 by default.').optional()
}).meta({ id: 'MlDatafeedConfig' })
export type MlDatafeedConfig = z.infer<typeof MlDatafeedConfig>

export const MlRunningStateSearchInterval = z.object({
  end: Duration.describe('The end time.').optional(),
  end_ms: DurationValue.describe('The end time as an epoch in milliseconds.'),
  start: Duration.describe('The start time.').optional(),
  start_ms: DurationValue.describe('The start time as an epoch in milliseconds.')
}).meta({ id: 'MlRunningStateSearchInterval' })
export type MlRunningStateSearchInterval = z.infer<typeof MlRunningStateSearchInterval>

export const MlDatafeedRunningState = z.object({
  real_time_configured: z.boolean().describe('Indicates if the datafeed is "real-time"; meaning that the datafeed has no configured `end` time.'),
  real_time_running: z.boolean().describe('Indicates whether the datafeed has finished running on the available past data. For datafeeds without a configured `end` time, this means that the datafeed is now running on "real-time" data.'),
  search_interval: MlRunningStateSearchInterval.describe('Provides the latest time interval the datafeed has searched.').optional()
}).meta({ id: 'MlDatafeedRunningState' })
export type MlDatafeedRunningState = z.infer<typeof MlDatafeedRunningState>

/** Alternative representation of DiscoveryNode used in ml.get_job_stats and ml.get_datafeed_stats */
export const MlDiscoveryNodeCompact = z.object({
  name: Name,
  ephemeral_id: Id,
  id: Id,
  transport_address: TransportAddress,
  attributes: z.record(z.string(), z.string())
}).meta({ id: 'MlDiscoveryNodeCompact' })
export type MlDiscoveryNodeCompact = z.infer<typeof MlDiscoveryNodeCompact>

export const MlExponentialAverageCalculationContext = z.object({
  incremental_metric_value_ms: DurationValue,
  latest_timestamp: EpochTime.optional(),
  previous_exponential_average_ms: DurationValue.optional()
}).meta({ id: 'MlExponentialAverageCalculationContext' })
export type MlExponentialAverageCalculationContext = z.infer<typeof MlExponentialAverageCalculationContext>

export const MlDatafeedTimingStats = z.object({
  bucket_count: long.describe('The number of buckets processed.'),
  exponential_average_search_time_per_hour_ms: DurationValue.describe('The exponential average search time per hour, in milliseconds.'),
  exponential_average_calculation_context: MlExponentialAverageCalculationContext.optional(),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  search_count: long.describe('The number of searches run by the datafeed.'),
  total_search_time_ms: DurationValue.describe('The total time the datafeed spent searching, in milliseconds.'),
  average_search_time_per_bucket_ms: DurationValue.describe('The average search time per bucket, in milliseconds.').optional()
}).meta({ id: 'MlDatafeedTimingStats' })
export type MlDatafeedTimingStats = z.infer<typeof MlDatafeedTimingStats>

export const MlDatafeedStats = z.object({
  assignment_explanation: z.string().describe('For started datafeeds only, contains messages relating to the selection of a node.').optional(),
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.'),
  state: MlDatafeedState.describe('The status of the datafeed, which can be one of the following values: `starting`, `started`, `stopping`, `stopped`.'),
  timing_stats: MlDatafeedTimingStats.describe('An object that provides statistical information about timing aspect of this datafeed.').optional(),
  running_state: MlDatafeedRunningState.describe('An object containing the running state for this datafeed. It is only provided if the datafeed is started.').optional()
}).meta({ id: 'MlDatafeedStats' })
export type MlDatafeedStats = z.infer<typeof MlDatafeedStats>

export const MlDataframeAnalysisFeatureProcessorFrequencyEncoding = z.object({
  feature_name: Name.describe('The resulting feature name.'),
  field: Field,
  frequency_map: z.record(z.string(), double).describe('The resulting frequency map for the field value. If the field value is missing from the frequency_map, the resulting value is 0.')
}).meta({ id: 'MlDataframeAnalysisFeatureProcessorFrequencyEncoding' })
export type MlDataframeAnalysisFeatureProcessorFrequencyEncoding = z.infer<typeof MlDataframeAnalysisFeatureProcessorFrequencyEncoding>

export const MlDataframeAnalysisFeatureProcessorMultiEncoding = z.object({
  processors: z.array(integer).describe('The ordered array of custom processors to execute. Must be more than 1.')
}).meta({ id: 'MlDataframeAnalysisFeatureProcessorMultiEncoding' })
export type MlDataframeAnalysisFeatureProcessorMultiEncoding = z.infer<typeof MlDataframeAnalysisFeatureProcessorMultiEncoding>

export const MlDataframeAnalysisFeatureProcessorNGramEncoding = z.object({
  feature_prefix: z.string().describe('The feature name prefix. Defaults to ngram_<start>_<length>.').optional(),
  field: Field.describe('The name of the text field to encode.'),
  length: integer.describe('Specifies the length of the n-gram substring. Defaults to 50. Must be greater than 0.').optional(),
  n_grams: z.array(integer).describe('Specifies which n-grams to gather. It’s an array of integer values where the minimum value is 1, and a maximum value is 5.'),
  start: integer.describe('Specifies the zero-indexed start of the n-gram substring. Negative values are allowed for encoding n-grams of string suffixes. Defaults to 0.').optional(),
  custom: z.boolean().optional()
}).meta({ id: 'MlDataframeAnalysisFeatureProcessorNGramEncoding' })
export type MlDataframeAnalysisFeatureProcessorNGramEncoding = z.infer<typeof MlDataframeAnalysisFeatureProcessorNGramEncoding>

export const MlDataframeAnalysisFeatureProcessorOneHotEncoding = z.object({
  field: Field.describe('The name of the field to encode.'),
  hot_map: z.string().describe('The one hot map mapping the field value with the column name.')
}).meta({ id: 'MlDataframeAnalysisFeatureProcessorOneHotEncoding' })
export type MlDataframeAnalysisFeatureProcessorOneHotEncoding = z.infer<typeof MlDataframeAnalysisFeatureProcessorOneHotEncoding>

export const MlDataframeAnalysisFeatureProcessorTargetMeanEncoding = z.object({
  default_value: integer.describe('The default value if field value is not found in the target_map.'),
  feature_name: Name.describe('The resulting feature name.'),
  field: Field.describe('The name of the field to encode.'),
  target_map: z.record(z.string(), z.any()).describe('The field value to target mean transition map.')
}).meta({ id: 'MlDataframeAnalysisFeatureProcessorTargetMeanEncoding' })
export type MlDataframeAnalysisFeatureProcessorTargetMeanEncoding = z.infer<typeof MlDataframeAnalysisFeatureProcessorTargetMeanEncoding>

const MlDataframeAnalysisFeatureProcessorExclusiveProps = z.union([z.object({ frequency_encoding: MlDataframeAnalysisFeatureProcessorFrequencyEncoding }), z.object({ multi_encoding: MlDataframeAnalysisFeatureProcessorMultiEncoding }), z.object({ n_gram_encoding: MlDataframeAnalysisFeatureProcessorNGramEncoding }), z.object({ one_hot_encoding: MlDataframeAnalysisFeatureProcessorOneHotEncoding }), z.object({ target_mean_encoding: MlDataframeAnalysisFeatureProcessorTargetMeanEncoding })])

export const MlDataframeAnalysisFeatureProcessor = MlDataframeAnalysisFeatureProcessorExclusiveProps.meta({ id: 'MlDataframeAnalysisFeatureProcessor' })
export type MlDataframeAnalysisFeatureProcessor = z.infer<typeof MlDataframeAnalysisFeatureProcessor>

export const MlDataframeAnalysis = z.object({
  alpha: double.describe('Advanced configuration option. Machine learning uses loss guided tree growing, which means that the decision trees grow where the regularized loss decreases most quickly. This parameter affects loss calculations by acting as a multiplier of the tree depth. Higher alpha values result in shallower trees and faster training times. By default, this value is calculated during hyperparameter optimization. It must be greater than or equal to zero.').optional(),
  dependent_variable: z.string().describe('Defines which field of the document is to be predicted. It must match one of the fields in the index being used to train. If this field is missing from a document, then that document will not be used for training, but a prediction with the trained model will be generated for it. It is also known as continuous target variable. For classification analysis, the data type of the field must be numeric (`integer`, `short`, `long`, `byte`), categorical (`ip` or `keyword`), or `boolean`. There must be no more than 30 different values in this field. For regression analysis, the data type of the field must be numeric.'),
  downsample_factor: double.describe('Advanced configuration option. Controls the fraction of data that is used to compute the derivatives of the loss function for tree training. A small value results in the use of a small fraction of the data. If this value is set to be less than 1, accuracy typically improves. However, too small a value may result in poor convergence for the ensemble and so require more trees. By default, this value is calculated during hyperparameter optimization. It must be greater than zero and less than or equal to 1.').optional(),
  early_stopping_enabled: z.boolean().describe('Advanced configuration option. Specifies whether the training process should finish if it is not finding any better performing models. If disabled, the training process can take significantly longer and the chance of finding a better performing model is unremarkable.').optional(),
  eta: double.describe('Advanced configuration option. The shrinkage applied to the weights. Smaller values result in larger forests which have a better generalization error. However, larger forests cause slower training. By default, this value is calculated during hyperparameter optimization. It must be a value between 0.001 and 1.').optional(),
  eta_growth_rate_per_tree: double.describe('Advanced configuration option. Specifies the rate at which `eta` increases for each new tree that is added to the forest. For example, a rate of 1.05 increases `eta` by 5% for each extra tree. By default, this value is calculated during hyperparameter optimization. It must be between 0.5 and 2.').optional(),
  feature_bag_fraction: double.describe('Advanced configuration option. Defines the fraction of features that will be used when selecting a random bag for each candidate split. By default, this value is calculated during hyperparameter optimization.').optional(),
  feature_processors: z.array(MlDataframeAnalysisFeatureProcessor).describe('Advanced configuration option. A collection of feature preprocessors that modify one or more included fields. The analysis uses the resulting one or more features instead of the original document field. However, these features are ephemeral; they are not stored in the destination index. Multiple `feature_processors` entries can refer to the same document fields. Automatic categorical feature encoding still occurs for the fields that are unprocessed by a custom processor or that have categorical values. Use this property only if you want to override the automatic feature encoding of the specified fields.').optional(),
  gamma: double.describe('Advanced configuration option. Regularization parameter to prevent overfitting on the training data set. Multiplies a linear penalty associated with the size of individual trees in the forest. A high gamma value causes training to prefer small trees. A small gamma value results in larger individual trees and slower training. By default, this value is calculated during hyperparameter optimization. It must be a nonnegative value.').optional(),
  lambda: double.describe('Advanced configuration option. Regularization parameter to prevent overfitting on the training data set. Multiplies an L2 regularization term which applies to leaf weights of the individual trees in the forest. A high lambda value causes training to favor small leaf weights. This behavior makes the prediction function smoother at the expense of potentially not being able to capture relevant relationships between the features and the dependent variable. A small lambda value results in large individual trees and slower training. By default, this value is calculated during hyperparameter optimization. It must be a nonnegative value.').optional(),
  max_optimization_rounds_per_hyperparameter: integer.describe('Advanced configuration option. A multiplier responsible for determining the maximum number of hyperparameter optimization steps in the Bayesian optimization procedure. The maximum number of steps is determined based on the number of undefined hyperparameters times the maximum optimization rounds per hyperparameter. By default, this value is calculated during hyperparameter optimization.').optional(),
  max_trees: integer.describe('Advanced configuration option. Defines the maximum number of decision trees in the forest. The maximum value is 2000. By default, this value is calculated during hyperparameter optimization.').optional(),
  maximum_number_trees: integer.describe('Advanced configuration option. Defines the maximum number of decision trees in the forest. The maximum value is 2000. By default, this value is calculated during hyperparameter optimization.').optional(),
  num_top_feature_importance_values: integer.describe('Advanced configuration option. Specifies the maximum number of feature importance values per document to return. By default, no feature importance calculation occurs.').optional(),
  prediction_field_name: Field.describe('Defines the name of the prediction field in the results. Defaults to `<dependent_variable>_prediction`.').optional(),
  randomize_seed: double.describe('Defines the seed for the random generator that is used to pick training data. By default, it is randomly generated. Set it to a specific value to use the same training data each time you start a job (assuming other related parameters such as `source` and `analyzed_fields` are the same).').optional(),
  soft_tree_depth_limit: integer.describe('Advanced configuration option. Machine learning uses loss guided tree growing, which means that the decision trees grow where the regularized loss decreases most quickly. This soft limit combines with the `soft_tree_depth_tolerance` to penalize trees that exceed the specified depth; the regularized loss increases quickly beyond this depth. By default, this value is calculated during hyperparameter optimization. It must be greater than or equal to 0.').optional(),
  soft_tree_depth_tolerance: double.describe('Advanced configuration option. This option controls how quickly the regularized loss increases when the tree depth exceeds `soft_tree_depth_limit`. By default, this value is calculated during hyperparameter optimization. It must be greater than or equal to 0.01.').optional(),
  training_percent: Percentage.describe('Defines what percentage of the eligible documents that will be used for training. Documents that are ignored by the analysis (for example those that contain arrays with more than one value) won’t be included in the calculation for used percentage.').optional()
}).meta({ id: 'MlDataframeAnalysis' })
export type MlDataframeAnalysis = z.infer<typeof MlDataframeAnalysis>

export const MlDataframeAnalysisAnalyzedFields = z.object({
  includes: z.array(z.string()).describe('An array of strings that defines the fields that will be excluded from the analysis. You do not need to add fields with unsupported data types to excludes, these fields are excluded from the analysis automatically.').optional(),
  excludes: z.array(z.string()).describe('An array of strings that defines the fields that will be included in the analysis.').optional()
}).meta({ id: 'MlDataframeAnalysisAnalyzedFields' })
export type MlDataframeAnalysisAnalyzedFields = z.infer<typeof MlDataframeAnalysisAnalyzedFields>

export const MlDataframeAnalysisClassification = z.object({
  ...MlDataframeAnalysis.shape,
  class_assignment_objective: z.string().optional(),
  num_top_classes: integer.describe('Defines the number of categories for which the predicted probabilities are reported. It must be non-negative or -1. If it is -1 or greater than the total number of categories, probabilities are reported for all categories; if you have a large number of categories, there could be a significant effect on the size of your destination index. NOTE: To use the AUC ROC evaluation method, `num_top_classes` must be set to -1 or a value greater than or equal to the total number of categories.').optional()
}).meta({ id: 'MlDataframeAnalysisClassification' })
export type MlDataframeAnalysisClassification = z.infer<typeof MlDataframeAnalysisClassification>

export const MlDataframeAnalysisOutlierDetection = z.object({
  compute_feature_influence: z.boolean().describe('Specifies whether the feature influence calculation is enabled.').optional(),
  feature_influence_threshold: double.describe('The minimum outlier score that a document needs to have in order to calculate its feature influence score. Value range: 0-1.').optional(),
  method: z.string().describe('The method that outlier detection uses. Available methods are `lof`, `ldof`, `distance_kth_nn`, `distance_knn`, and `ensemble`. The default value is ensemble, which means that outlier detection uses an ensemble of different methods and normalises and combines their individual outlier scores to obtain the overall outlier score.').optional(),
  n_neighbors: integer.describe('Defines the value for how many nearest neighbors each method of outlier detection uses to calculate its outlier score. When the value is not set, different values are used for different ensemble members. This default behavior helps improve the diversity in the ensemble; only override it if you are confident that the value you choose is appropriate for the data set.').optional(),
  outlier_fraction: double.describe('The proportion of the data set that is assumed to be outlying prior to outlier detection. For example, 0.05 means it is assumed that 5% of values are real outliers and 95% are inliers.').optional(),
  standardization_enabled: z.boolean().describe('If true, the following operation is performed on the columns before computing outlier scores: `(x_i - mean(x_i)) / sd(x_i)`.').optional()
}).meta({ id: 'MlDataframeAnalysisOutlierDetection' })
export type MlDataframeAnalysisOutlierDetection = z.infer<typeof MlDataframeAnalysisOutlierDetection>

export const MlDataframeAnalysisRegression = z.object({
  ...MlDataframeAnalysis.shape,
  loss_function: z.string().describe('The loss function used during regression. Available options are `mse` (mean squared error), `msle` (mean squared logarithmic error), `huber` (Pseudo-Huber loss).').optional(),
  loss_function_parameter: double.describe('A positive number that is used as a parameter to the `loss_function`.').optional()
}).meta({ id: 'MlDataframeAnalysisRegression' })
export type MlDataframeAnalysisRegression = z.infer<typeof MlDataframeAnalysisRegression>

const MlDataframeAnalysisContainerExclusiveProps = z.union([z.object({ classification: MlDataframeAnalysisClassification }), z.object({ outlier_detection: MlDataframeAnalysisOutlierDetection }), z.object({ regression: MlDataframeAnalysisRegression })])

export const MlDataframeAnalysisContainer = MlDataframeAnalysisContainerExclusiveProps.meta({ id: 'MlDataframeAnalysisContainer' })
export type MlDataframeAnalysisContainer = z.infer<typeof MlDataframeAnalysisContainer>

export const MlHyperparameters = z.object({
  alpha: double.describe('Advanced configuration option. Machine learning uses loss guided tree growing, which means that the decision trees grow where the regularized loss decreases most quickly. This parameter affects loss calculations by acting as a multiplier of the tree depth. Higher alpha values result in shallower trees and faster training times. By default, this value is calculated during hyperparameter optimization. It must be greater than or equal to zero.').optional(),
  lambda: double.describe('Advanced configuration option. Regularization parameter to prevent overfitting on the training data set. Multiplies an L2 regularization term which applies to leaf weights of the individual trees in the forest. A high lambda value causes training to favor small leaf weights. This behavior makes the prediction function smoother at the expense of potentially not being able to capture relevant relationships between the features and the dependent variable. A small lambda value results in large individual trees and slower training. By default, this value is calculated during hyperparameter optimization. It must be a nonnegative value.').optional(),
  gamma: double.describe('Advanced configuration option. Regularization parameter to prevent overfitting on the training data set. Multiplies a linear penalty associated with the size of individual trees in the forest. A high gamma value causes training to prefer small trees. A small gamma value results in larger individual trees and slower training. By default, this value is calculated during hyperparameter optimization. It must be a nonnegative value.').optional(),
  eta: double.describe('Advanced configuration option. The shrinkage applied to the weights. Smaller values result in larger forests which have a better generalization error. However, larger forests cause slower training. By default, this value is calculated during hyperparameter optimization. It must be a value between `0.001` and `1`.').optional(),
  eta_growth_rate_per_tree: double.describe('Advanced configuration option. Specifies the rate at which `eta` increases for each new tree that is added to the forest. For example, a rate of 1.05 increases `eta` by 5% for each extra tree. By default, this value is calculated during hyperparameter optimization. It must be between `0.5` and `2`.').optional(),
  feature_bag_fraction: double.describe('Advanced configuration option. Defines the fraction of features that will be used when selecting a random bag for each candidate split. By default, this value is calculated during hyperparameter optimization.').optional(),
  downsample_factor: double.describe('Advanced configuration option. Controls the fraction of data that is used to compute the derivatives of the loss function for tree training. A small value results in the use of a small fraction of the data. If this value is set to be less than 1, accuracy typically improves. However, too small a value may result in poor convergence for the ensemble and so require more trees. By default, this value is calculated during hyperparameter optimization. It must be greater than zero and less than or equal to 1.').optional(),
  max_attempts_to_add_tree: integer.describe('If the algorithm fails to determine a non-trivial tree (more than a single leaf), this parameter determines how many of such consecutive failures are tolerated. Once the number of attempts exceeds the threshold, the forest training stops.').optional(),
  max_optimization_rounds_per_hyperparameter: integer.describe('Advanced configuration option. A multiplier responsible for determining the maximum number of hyperparameter optimization steps in the Bayesian optimization procedure. The maximum number of steps is determined based on the number of undefined hyperparameters times the maximum optimization rounds per hyperparameter. By default, this value is calculated during hyperparameter optimization.').optional(),
  max_trees: integer.describe('Advanced configuration option. Defines the maximum number of decision trees in the forest. The maximum value is 2000. By default, this value is calculated during hyperparameter optimization.').optional(),
  num_folds: integer.describe('The maximum number of folds for the cross-validation procedure.').optional(),
  num_splits_per_feature: integer.describe('Determines the maximum number of splits for every feature that can occur in a decision tree when the tree is trained.').optional(),
  soft_tree_depth_limit: integer.describe('Advanced configuration option. Machine learning uses loss guided tree growing, which means that the decision trees grow where the regularized loss decreases most quickly. This soft limit combines with the `soft_tree_depth_tolerance` to penalize trees that exceed the specified depth; the regularized loss increases quickly beyond this depth. By default, this value is calculated during hyperparameter optimization. It must be greater than or equal to 0.').optional(),
  soft_tree_depth_tolerance: double.describe('Advanced configuration option. This option controls how quickly the regularized loss increases when the tree depth exceeds `soft_tree_depth_limit`. By default, this value is calculated during hyperparameter optimization. It must be greater than or equal to 0.01.').optional()
}).meta({ id: 'MlHyperparameters' })
export type MlHyperparameters = z.infer<typeof MlHyperparameters>

export const MlTimingStats = z.object({
  elapsed_time: DurationValue.describe('Runtime of the analysis in milliseconds.'),
  iteration_time: DurationValue.describe('Runtime of the latest iteration of the analysis in milliseconds.').optional()
}).meta({ id: 'MlTimingStats' })
export type MlTimingStats = z.infer<typeof MlTimingStats>

export const MlValidationLoss = z.object({
  fold_values: z.array(z.string()).describe('Validation loss values for every added decision tree during the forest growing procedure.'),
  loss_type: z.string().describe('The type of the loss metric. For example, binomial_logistic.')
}).meta({ id: 'MlValidationLoss' })
export type MlValidationLoss = z.infer<typeof MlValidationLoss>

export const MlDataframeAnalyticsStatsHyperparameters = z.object({
  hyperparameters: MlHyperparameters.describe('An object containing the parameters of the classification analysis job.'),
  iteration: integer.describe('The number of iterations on the analysis.'),
  timestamp: EpochTime.describe('The timestamp when the statistics were reported in milliseconds since the epoch.'),
  timing_stats: MlTimingStats.describe('An object containing time statistics about the data frame analytics job.'),
  validation_loss: MlValidationLoss.describe('An object containing information about validation loss.')
}).meta({ id: 'MlDataframeAnalyticsStatsHyperparameters' })
export type MlDataframeAnalyticsStatsHyperparameters = z.infer<typeof MlDataframeAnalyticsStatsHyperparameters>

export const MlOutlierDetectionParameters = z.object({
  compute_feature_influence: z.boolean().describe('Specifies whether the feature influence calculation is enabled.').optional(),
  feature_influence_threshold: double.describe('The minimum outlier score that a document needs to have in order to calculate its feature influence score. Value range: 0-1').optional(),
  method: z.string().describe('The method that outlier detection uses. Available methods are `lof`, `ldof`, `distance_kth_nn`, `distance_knn`, and `ensemble`. The default value is ensemble, which means that outlier detection uses an ensemble of different methods and normalises and combines their individual outlier scores to obtain the overall outlier score.').optional(),
  n_neighbors: integer.describe('Defines the value for how many nearest neighbors each method of outlier detection uses to calculate its outlier score. When the value is not set, different values are used for different ensemble members. This default behavior helps improve the diversity in the ensemble; only override it if you are confident that the value you choose is appropriate for the data set.').optional(),
  outlier_fraction: double.describe('The proportion of the data set that is assumed to be outlying prior to outlier detection. For example, 0.05 means it is assumed that 5% of values are real outliers and 95% are inliers.').optional(),
  standardization_enabled: z.boolean().describe('If `true`, the following operation is performed on the columns before computing outlier scores: (x_i - mean(x_i)) / sd(x_i).').optional()
}).meta({ id: 'MlOutlierDetectionParameters' })
export type MlOutlierDetectionParameters = z.infer<typeof MlOutlierDetectionParameters>

export const MlDataframeAnalyticsStatsOutlierDetection = z.object({
  parameters: MlOutlierDetectionParameters.describe('The list of job parameters specified by the user or determined by algorithmic heuristics.'),
  timestamp: EpochTime.describe('The timestamp when the statistics were reported in milliseconds since the epoch.'),
  timing_stats: MlTimingStats.describe('An object containing time statistics about the data frame analytics job.')
}).meta({ id: 'MlDataframeAnalyticsStatsOutlierDetection' })
export type MlDataframeAnalyticsStatsOutlierDetection = z.infer<typeof MlDataframeAnalyticsStatsOutlierDetection>

const MlDataframeAnalyticsStatsContainerExclusiveProps = z.union([z.object({ classification_stats: MlDataframeAnalyticsStatsHyperparameters }), z.object({ outlier_detection_stats: MlDataframeAnalyticsStatsOutlierDetection }), z.object({ regression_stats: MlDataframeAnalyticsStatsHyperparameters })])

export const MlDataframeAnalyticsStatsContainer = MlDataframeAnalyticsStatsContainerExclusiveProps.meta({ id: 'MlDataframeAnalyticsStatsContainer' })
export type MlDataframeAnalyticsStatsContainer = z.infer<typeof MlDataframeAnalyticsStatsContainer>

export const MlDataframeAnalyticsStatsDataCounts = z.object({
  skipped_docs_count: integer.describe('The number of documents that are skipped during the analysis because they contained values that are not supported by the analysis. For example, outlier detection does not support missing fields so it skips documents with missing fields. Likewise, all types of analysis skip documents that contain arrays with more than one element.'),
  test_docs_count: integer.describe('The number of documents that are not used for training the model and can be used for testing.'),
  training_docs_count: integer.describe('The number of documents that are used for training the model.')
}).meta({ id: 'MlDataframeAnalyticsStatsDataCounts' })
export type MlDataframeAnalyticsStatsDataCounts = z.infer<typeof MlDataframeAnalyticsStatsDataCounts>

export const MlDataframeAnalyticsStatsMemoryUsage = z.object({
  memory_reestimate_bytes: long.describe('This value is present when the status is hard_limit and it is a new estimate of how much memory the job needs.').optional(),
  peak_usage_bytes: long.describe('The number of bytes used at the highest peak of memory usage.'),
  status: z.string().describe('The memory usage status.'),
  timestamp: EpochTime.describe('The timestamp when memory usage was calculated.').optional()
}).meta({ id: 'MlDataframeAnalyticsStatsMemoryUsage' })
export type MlDataframeAnalyticsStatsMemoryUsage = z.infer<typeof MlDataframeAnalyticsStatsMemoryUsage>

export const MlDataframeAnalyticsStatsProgress = z.object({
  phase: z.string().describe('Defines the phase of the data frame analytics job.'),
  progress_percent: integer.describe('The progress that the data frame analytics job has made expressed in percentage.')
}).meta({ id: 'MlDataframeAnalyticsStatsProgress' })
export type MlDataframeAnalyticsStatsProgress = z.infer<typeof MlDataframeAnalyticsStatsProgress>

export const MlDataframeState = z.enum(['started', 'stopped', 'starting', 'stopping', 'failed']).meta({ id: 'MlDataframeState' })
export type MlDataframeState = z.infer<typeof MlDataframeState>

export const MlDataframeAnalytics = z.object({
  analysis_stats: MlDataframeAnalyticsStatsContainer.describe('An object containing information about the analysis job.').optional(),
  assignment_explanation: z.string().describe('For running jobs only, contains messages relating to the selection of a node to run the job.').optional(),
  data_counts: MlDataframeAnalyticsStatsDataCounts.describe('An object that provides counts for the quantity of documents skipped, used in training, or available for testing.'),
  id: Id.describe('The unique identifier of the data frame analytics job.'),
  memory_usage: MlDataframeAnalyticsStatsMemoryUsage.describe('An object describing memory usage of the analytics. It is present only after the job is started and memory usage is reported.'),
  progress: z.array(MlDataframeAnalyticsStatsProgress).describe('The progress report of the data frame analytics job by phase.'),
  state: MlDataframeState.describe('The status of the data frame analytics job, which can be one of the following values: failed, started, starting, stopping, stopped.')
}).meta({ id: 'MlDataframeAnalytics' })
export type MlDataframeAnalytics = z.infer<typeof MlDataframeAnalytics>

export const MlDataframeAnalyticsAuthorization = z.object({
  api_key: MlApiKeyAuthorization.describe('If an API key was used for the most recent update to the job, its name and identifier are listed in the response.').optional(),
  roles: z.array(z.string()).describe('If a user ID was used for the most recent update to the job, its roles at the time of the update are listed in the response.').optional(),
  service_account: z.string().describe('If a service account was used for the most recent update to the job, the account name is listed in the response.').optional()
}).meta({ id: 'MlDataframeAnalyticsAuthorization' })
export type MlDataframeAnalyticsAuthorization = z.infer<typeof MlDataframeAnalyticsAuthorization>

export const MlDataframeAnalyticsDestination = z.object({
  index: IndexName.describe('Defines the destination index to store the results of the data frame analytics job.'),
  results_field: Field.describe('Defines the name of the field in which to store the results of the analysis. Defaults to `ml`.').optional()
}).meta({ id: 'MlDataframeAnalyticsDestination' })
export type MlDataframeAnalyticsDestination = z.infer<typeof MlDataframeAnalyticsDestination>

export const MlDataframeAnalyticsFieldSelection = z.object({
  is_included: z.boolean().describe('Whether the field is selected to be included in the analysis.'),
  is_required: z.boolean().describe('Whether the field is required.'),
  feature_type: z.string().describe('The feature type of this field for the analysis. May be categorical or numerical.').optional(),
  mapping_types: z.array(z.string()).describe('The mapping types of the field.'),
  name: Field.describe('The field name.'),
  reason: z.string().describe('The reason a field is not selected to be included in the analysis.').optional()
}).meta({ id: 'MlDataframeAnalyticsFieldSelection' })
export type MlDataframeAnalyticsFieldSelection = z.infer<typeof MlDataframeAnalyticsFieldSelection>

export const MlDataframeAnalyticsMemoryEstimation = z.object({
  expected_memory_with_disk: z.string().describe('Estimated memory usage under the assumption that overflowing to disk is allowed during data frame analytics. expected_memory_with_disk is usually smaller than expected_memory_without_disk as using disk allows to limit the main memory needed to perform data frame analytics.'),
  expected_memory_without_disk: z.string().describe('Estimated memory usage under the assumption that the whole data frame analytics should happen in memory (i.e. without overflowing to disk).')
}).meta({ id: 'MlDataframeAnalyticsMemoryEstimation' })
export type MlDataframeAnalyticsMemoryEstimation = z.infer<typeof MlDataframeAnalyticsMemoryEstimation>

export const MlDataframeAnalyticsSource = z.object({
  index: Indices.describe('Index or indices on which to perform the analysis. It can be a single index or index pattern as well as an array of indices or patterns. NOTE: If your source indices contain documents with the same IDs, only the document that is indexed last appears in the destination index.'),
  query: z.lazy(() => QueryDslQueryContainer).describe('The Elasticsearch query domain-specific language (DSL). This value corresponds to the query object in an Elasticsearch search POST body. All the options that are supported by Elasticsearch can be used, as this object is passed verbatim to Elasticsearch. By default, this property has the following value: {"match_all": {}}.').optional(),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('Definitions of runtime fields that will become part of the mapping of the destination index.').optional(),
  _source: MlDataframeAnalysisAnalyzedFields.describe('Specify `includes` and/or `excludes patterns to select which fields will be present in the destination. Fields that are excluded cannot be included in the analysis.').optional()
}).meta({ id: 'MlDataframeAnalyticsSource' })
export type MlDataframeAnalyticsSource = z.infer<typeof MlDataframeAnalyticsSource>

export const MlDataframeAnalyticsSummary = z.object({
  allow_lazy_start: z.boolean().optional(),
  analysis: MlDataframeAnalysisContainer,
  analyzed_fields: MlDataframeAnalysisAnalyzedFields.optional(),
  authorization: MlDataframeAnalyticsAuthorization.describe('The security privileges that the job uses to run its queries. If Elastic Stack security features were disabled at the time of the most recent update to the job, this property is omitted.').optional(),
  create_time: EpochTime.optional(),
  description: z.string().optional(),
  dest: MlDataframeAnalyticsDestination,
  id: Id,
  max_num_threads: integer.optional(),
  model_memory_limit: z.string().optional(),
  source: MlDataframeAnalyticsSource,
  version: VersionString.optional(),
  _meta: Metadata.optional()
}).meta({ id: 'MlDataframeAnalyticsSummary' })
export type MlDataframeAnalyticsSummary = z.infer<typeof MlDataframeAnalyticsSummary>

export const MlDataframeEvaluationClassificationMetricsAucRoc = z.object({
  class_name: Name.describe('Name of the only class that is treated as positive during AUC ROC calculation. Other classes are treated as negative ("one-vs-all" strategy). All the evaluated documents must have class_name in the list of their top classes.').optional(),
  include_curve: z.boolean().describe('Whether or not the curve should be returned in addition to the score. Default value is false.').optional()
}).meta({ id: 'MlDataframeEvaluationClassificationMetricsAucRoc' })
export type MlDataframeEvaluationClassificationMetricsAucRoc = z.infer<typeof MlDataframeEvaluationClassificationMetricsAucRoc>

export const MlDataframeEvaluationMetrics = z.object({
  auc_roc: MlDataframeEvaluationClassificationMetricsAucRoc.describe('The AUC ROC (area under the curve of the receiver operating characteristic) score and optionally the curve. It is calculated for a specific class (provided as "class_name") treated as positive.').optional(),
  precision: z.record(z.string(), z.any()).describe('Precision of predictions (per-class and average).').optional(),
  recall: z.record(z.string(), z.any()).describe('Recall of predictions (per-class and average).').optional()
}).meta({ id: 'MlDataframeEvaluationMetrics' })
export type MlDataframeEvaluationMetrics = z.infer<typeof MlDataframeEvaluationMetrics>

export const MlDataframeEvaluationClassificationMetrics = z.object({
  ...MlDataframeEvaluationMetrics.shape,
  accuracy: z.record(z.string(), z.any()).describe('Accuracy of predictions (per-class and overall).').optional(),
  multiclass_confusion_matrix: z.record(z.string(), z.any()).describe('Multiclass confusion matrix.').optional()
}).meta({ id: 'MlDataframeEvaluationClassificationMetrics' })
export type MlDataframeEvaluationClassificationMetrics = z.infer<typeof MlDataframeEvaluationClassificationMetrics>

export const MlDataframeEvaluationClassification = z.object({
  actual_field: Field.describe('The field of the index which contains the ground truth. The data type of this field can be boolean or integer. If the data type is integer, the value has to be either 0 (false) or 1 (true).'),
  predicted_field: Field.describe('The field in the index which contains the predicted value, in other words the results of the classification analysis.').optional(),
  top_classes_field: Field.describe('The field of the index which is an array of documents of the form { "class_name": XXX, "class_probability": YYY }. This field must be defined as nested in the mappings.').optional(),
  metrics: MlDataframeEvaluationClassificationMetrics.describe('Specifies the metrics that are used for the evaluation.').optional()
}).meta({ id: 'MlDataframeEvaluationClassification' })
export type MlDataframeEvaluationClassification = z.infer<typeof MlDataframeEvaluationClassification>

export const MlDataframeEvaluationOutlierDetectionMetrics = z.object({
  ...MlDataframeEvaluationMetrics.shape,
  confusion_matrix: z.record(z.string(), z.any()).describe('Accuracy of predictions (per-class and overall).').optional()
}).meta({ id: 'MlDataframeEvaluationOutlierDetectionMetrics' })
export type MlDataframeEvaluationOutlierDetectionMetrics = z.infer<typeof MlDataframeEvaluationOutlierDetectionMetrics>

export const MlDataframeEvaluationOutlierDetection = z.object({
  actual_field: Field.describe('The field of the index which contains the ground truth. The data type of this field can be boolean or integer. If the data type is integer, the value has to be either 0 (false) or 1 (true).'),
  predicted_probability_field: Field.describe('The field of the index that defines the probability of whether the item belongs to the class in question or not. It’s the field that contains the results of the analysis.'),
  metrics: MlDataframeEvaluationOutlierDetectionMetrics.describe('Specifies the metrics that are used for the evaluation.').optional()
}).meta({ id: 'MlDataframeEvaluationOutlierDetection' })
export type MlDataframeEvaluationOutlierDetection = z.infer<typeof MlDataframeEvaluationOutlierDetection>

export const MlDataframeEvaluationRegressionMetricsMsle = z.object({
  offset: double.describe('Defines the transition point at which you switch from minimizing quadratic error to minimizing quadratic log error. Defaults to 1.').optional()
}).meta({ id: 'MlDataframeEvaluationRegressionMetricsMsle' })
export type MlDataframeEvaluationRegressionMetricsMsle = z.infer<typeof MlDataframeEvaluationRegressionMetricsMsle>

export const MlDataframeEvaluationRegressionMetricsHuber = z.object({
  delta: double.describe('Approximates 1/2 (prediction - actual)2 for values much less than delta and approximates a straight line with slope delta for values much larger than delta. Defaults to 1. Delta needs to be greater than 0.').optional()
}).meta({ id: 'MlDataframeEvaluationRegressionMetricsHuber' })
export type MlDataframeEvaluationRegressionMetricsHuber = z.infer<typeof MlDataframeEvaluationRegressionMetricsHuber>

export const MlDataframeEvaluationRegressionMetrics = z.object({
  mse: z.record(z.string(), z.any()).describe('Average squared difference between the predicted values and the actual (ground truth) value. For more information, read this wiki article.').optional(),
  msle: MlDataframeEvaluationRegressionMetricsMsle.describe('Average squared difference between the logarithm of the predicted values and the logarithm of the actual (ground truth) value.').optional(),
  huber: MlDataframeEvaluationRegressionMetricsHuber.describe('Pseudo Huber loss function.').optional(),
  r_squared: z.record(z.string(), z.any()).describe('Proportion of the variance in the dependent variable that is predictable from the independent variables.').optional()
}).meta({ id: 'MlDataframeEvaluationRegressionMetrics' })
export type MlDataframeEvaluationRegressionMetrics = z.infer<typeof MlDataframeEvaluationRegressionMetrics>

export const MlDataframeEvaluationRegression = z.object({
  actual_field: Field.describe('The field of the index which contains the ground truth. The data type of this field must be numerical.'),
  predicted_field: Field.describe('The field in the index that contains the predicted value, in other words the results of the regression analysis.'),
  metrics: MlDataframeEvaluationRegressionMetrics.describe('Specifies the metrics that are used for the evaluation. For more information on mse, msle, and huber, consult the Jupyter notebook on regression loss functions.').optional()
}).meta({ id: 'MlDataframeEvaluationRegression' })
export type MlDataframeEvaluationRegression = z.infer<typeof MlDataframeEvaluationRegression>

const MlDataframeEvaluationContainerExclusiveProps = z.union([z.object({ classification: MlDataframeEvaluationClassification }), z.object({ outlier_detection: MlDataframeEvaluationOutlierDetection }), z.object({ regression: MlDataframeEvaluationRegression })])

export const MlDataframeEvaluationContainer = MlDataframeEvaluationContainerExclusiveProps.meta({ id: 'MlDataframeEvaluationContainer' })
export type MlDataframeEvaluationContainer = z.infer<typeof MlDataframeEvaluationContainer>

export const MlDeploymentAllocationState = z.enum(['started', 'starting', 'fully_allocated']).meta({ id: 'MlDeploymentAllocationState' })
export type MlDeploymentAllocationState = z.infer<typeof MlDeploymentAllocationState>

export const MlDeploymentAssignmentState = z.enum(['started', 'starting', 'stopping', 'failed']).meta({ id: 'MlDeploymentAssignmentState' })
export type MlDeploymentAssignmentState = z.infer<typeof MlDeploymentAssignmentState>

export const MlDetectorUpdate = z.object({
  detector_index: integer.describe('A unique identifier for the detector. This identifier is based on the order of the detectors in the `analysis_config`, starting at zero.'),
  description: z.string().describe('A description of the detector.').optional(),
  custom_rules: z.array(MlDetectionRule).describe('An array of custom rule objects, which enable you to customize the way detectors operate. For example, a rule may dictate to the detector conditions under which results should be skipped. Kibana refers to custom rules as job rules.').optional()
}).meta({ id: 'MlDetectorUpdate' })
export type MlDetectorUpdate = z.infer<typeof MlDetectorUpdate>

export const MlDiscoveryNodeContent = z.object({
  name: Name.optional(),
  ephemeral_id: Id,
  transport_address: TransportAddress,
  external_id: z.string(),
  attributes: z.record(z.string(), z.string()),
  roles: z.array(z.string()),
  version: VersionString,
  min_index_version: integer,
  max_index_version: integer
}).meta({ id: 'MlDiscoveryNodeContent' })
export type MlDiscoveryNodeContent = z.infer<typeof MlDiscoveryNodeContent>

export const MlDiscoveryNode = z.record(Id, MlDiscoveryNodeContent).meta({ id: 'MlDiscoveryNode' })
export type MlDiscoveryNode = z.infer<typeof MlDiscoveryNode>

export const MlQueryFeatureExtractor = z.object({
  default_score: float.optional(),
  feature_name: z.string(),
  query: z.lazy(() => QueryDslQueryContainer)
}).meta({ id: 'MlQueryFeatureExtractor' })
export type MlQueryFeatureExtractor = z.infer<typeof MlQueryFeatureExtractor>

export const MlFeatureExtractor = MlQueryFeatureExtractor.meta({ id: 'MlFeatureExtractor' })
export type MlFeatureExtractor = z.infer<typeof MlFeatureExtractor>

/** BERT and MPNet tokenization configuration options */
export const MlNlpBertTokenizationConfig = z.object({
  ...MlCommonTokenizationConfig.shape
}).meta({ id: 'MlNlpBertTokenizationConfig' })
export type MlNlpBertTokenizationConfig = z.infer<typeof MlNlpBertTokenizationConfig>

/** RoBERTa tokenization configuration options */
export const MlNlpRobertaTokenizationConfig = z.object({
  ...MlCommonTokenizationConfig.shape,
  add_prefix_space: z.boolean().describe('Should the tokenizer prefix input with a space character').optional()
}).meta({ id: 'MlNlpRobertaTokenizationConfig' })
export type MlNlpRobertaTokenizationConfig = z.infer<typeof MlNlpRobertaTokenizationConfig>

export const MlXlmRobertaTokenizationConfig = z.object({
  ...MlCommonTokenizationConfig.shape
}).meta({ id: 'MlXlmRobertaTokenizationConfig' })
export type MlXlmRobertaTokenizationConfig = z.infer<typeof MlXlmRobertaTokenizationConfig>

const MlTokenizationConfigContainerExclusiveProps = z.union([z.object({ bert: MlNlpBertTokenizationConfig }), z.object({ bert_ja: MlNlpBertTokenizationConfig }), z.object({ mpnet: MlNlpBertTokenizationConfig }), z.object({ roberta: MlNlpRobertaTokenizationConfig }), z.object({ xlm_roberta: MlXlmRobertaTokenizationConfig })])

/** Tokenization options stored in inference configuration */
export const MlTokenizationConfigContainer = MlTokenizationConfigContainerExclusiveProps.meta({ id: 'MlTokenizationConfigContainer' })
export type MlTokenizationConfigContainer = z.infer<typeof MlTokenizationConfigContainer>

export const MlVocabulary = z.object({
  index: IndexName
}).meta({ id: 'MlVocabulary' })
export type MlVocabulary = z.infer<typeof MlVocabulary>

/** Fill mask inference options */
export const MlFillMaskInferenceOptions = z.object({
  mask_token: z.string().describe('The string/token which will be removed from incoming documents and replaced with the inference prediction(s). In a response, this field contains the mask token for the specified model/tokenizer. Each model and tokenizer has a predefined mask token which cannot be changed. Thus, it is recommended not to set this value in requests. However, if this field is present in a request, its value must match the predefined value for that model/tokenizer, otherwise the request will fail.').optional(),
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  tokenization: MlTokenizationConfigContainer.describe('The tokenization options to update when inferring').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  vocabulary: MlVocabulary.optional()
}).meta({ id: 'MlFillMaskInferenceOptions' })
export type MlFillMaskInferenceOptions = z.infer<typeof MlFillMaskInferenceOptions>

export const MlNlpTokenizationUpdateOptions = z.object({
  truncate: MlTokenizationTruncate.describe('Truncate options to apply').optional(),
  span: integer.describe('Span options to apply').optional()
}).meta({ id: 'MlNlpTokenizationUpdateOptions' })
export type MlNlpTokenizationUpdateOptions = z.infer<typeof MlNlpTokenizationUpdateOptions>

export const MlFillMaskInferenceUpdateOptions = z.object({
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  tokenization: MlNlpTokenizationUpdateOptions.describe('The tokenization options to update when inferring').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional()
}).meta({ id: 'MlFillMaskInferenceUpdateOptions' })
export type MlFillMaskInferenceUpdateOptions = z.infer<typeof MlFillMaskInferenceUpdateOptions>

export const MlFilter = z.object({
  description: z.string().describe('A description of the filter.').optional(),
  filter_id: Id.describe('A string that uniquely identifies a filter.'),
  items: z.array(z.string()).describe('An array of strings which is the filter item list.')
}).meta({ id: 'MlFilter' })
export type MlFilter = z.infer<typeof MlFilter>

export const MlHyperparameter = z.object({
  absolute_importance: double.describe('A positive number showing how much the parameter influences the variation of the loss function. For hyperparameters with values that are not specified by the user but tuned during hyperparameter optimization.').optional(),
  name: Name.describe('Name of the hyperparameter.'),
  relative_importance: double.describe('A number between 0 and 1 showing the proportion of influence on the variation of the loss function among all tuned hyperparameters. For hyperparameters with values that are not specified by the user but tuned during hyperparameter optimization.').optional(),
  supplied: z.boolean().describe('Indicates if the hyperparameter is specified by the user (true) or optimized (false).'),
  value: double.describe('The value of the hyperparameter, either optimized or specified by the user.')
}).meta({ id: 'MlHyperparameter' })
export type MlHyperparameter = z.infer<typeof MlHyperparameter>

export const MlInclude = z.enum(['definition', 'feature_importance_baseline', 'hyperparameters', 'total_feature_importance', 'definition_status']).meta({ id: 'MlInclude' })
export type MlInclude = z.infer<typeof MlInclude>

/** Text classification configuration options */
export const MlTextClassificationInferenceOptions = z.object({
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  tokenization: MlTokenizationConfigContainer.describe('The tokenization options').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  classification_labels: z.array(z.string()).describe('Classification labels to apply other than the stored labels. Must have the same deminsions as the default configured labels').optional(),
  vocabulary: MlVocabulary.optional()
}).meta({ id: 'MlTextClassificationInferenceOptions' })
export type MlTextClassificationInferenceOptions = z.infer<typeof MlTextClassificationInferenceOptions>

/** Zero shot classification configuration options */
export const MlZeroShotClassificationInferenceOptions = z.object({
  tokenization: MlTokenizationConfigContainer.describe('The tokenization options to update when inferring').optional(),
  hypothesis_template: z.string().describe('Hypothesis template used when tokenizing labels for prediction').optional(),
  classification_labels: z.array(z.string()).describe('The zero shot classification labels indicating entailment, neutral, and contradiction Must contain exactly and only entailment, neutral, and contradiction'),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  multi_label: z.boolean().describe('Indicates if more than one true label exists.').optional(),
  labels: z.array(z.string()).describe('The labels to predict.').optional()
}).meta({ id: 'MlZeroShotClassificationInferenceOptions' })
export type MlZeroShotClassificationInferenceOptions = z.infer<typeof MlZeroShotClassificationInferenceOptions>

export const MlLearningToRankConfig = z.object({
  default_params: z.record(z.string(), z.any()).optional(),
  feature_extractors: z.array(z.record(z.string(), MlFeatureExtractor)).optional(),
  num_top_feature_importance_values: integer
}).meta({ id: 'MlLearningToRankConfig' })
export type MlLearningToRankConfig = z.infer<typeof MlLearningToRankConfig>

/** Named entity recognition options */
export const MlNerInferenceOptions = z.object({
  tokenization: MlTokenizationConfigContainer.describe('The tokenization options').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  classification_labels: z.array(z.string()).describe('The token classification labels. Must be IOB formatted tags').optional(),
  vocabulary: MlVocabulary.optional()
}).meta({ id: 'MlNerInferenceOptions' })
export type MlNerInferenceOptions = z.infer<typeof MlNerInferenceOptions>

/** Pass through configuration options */
export const MlPassThroughInferenceOptions = z.object({
  tokenization: MlTokenizationConfigContainer.describe('The tokenization options').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  vocabulary: MlVocabulary.optional()
}).meta({ id: 'MlPassThroughInferenceOptions' })
export type MlPassThroughInferenceOptions = z.infer<typeof MlPassThroughInferenceOptions>

/** Text embedding inference options */
export const MlTextEmbeddingInferenceOptions = z.object({
  embedding_size: integer.describe('The number of dimensions in the embedding output').optional(),
  tokenization: MlTokenizationConfigContainer.describe('The tokenization options').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  vocabulary: MlVocabulary.optional()
}).meta({ id: 'MlTextEmbeddingInferenceOptions' })
export type MlTextEmbeddingInferenceOptions = z.infer<typeof MlTextEmbeddingInferenceOptions>

/** Text expansion inference options */
export const MlTextExpansionInferenceOptions = z.object({
  tokenization: MlTokenizationConfigContainer.describe('The tokenization options').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  vocabulary: MlVocabulary.optional()
}).meta({ id: 'MlTextExpansionInferenceOptions' })
export type MlTextExpansionInferenceOptions = z.infer<typeof MlTextExpansionInferenceOptions>

/** Question answering inference options */
export const MlQuestionAnsweringInferenceOptions = z.object({
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  tokenization: MlTokenizationConfigContainer.describe('The tokenization options to update when inferring').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  max_answer_length: integer.describe('The maximum answer length to consider').optional()
}).meta({ id: 'MlQuestionAnsweringInferenceOptions' })
export type MlQuestionAnsweringInferenceOptions = z.infer<typeof MlQuestionAnsweringInferenceOptions>

const MlInferenceConfigCreateContainerExclusiveProps = z.union([z.object({ regression: z.lazy(() => MlRegressionInferenceOptions) }), z.object({ classification: z.lazy(() => MlClassificationInferenceOptions) }), z.object({ text_classification: MlTextClassificationInferenceOptions }), z.object({ zero_shot_classification: MlZeroShotClassificationInferenceOptions }), z.object({ fill_mask: MlFillMaskInferenceOptions }), z.object({ learning_to_rank: MlLearningToRankConfig }), z.object({ ner: MlNerInferenceOptions }), z.object({ pass_through: MlPassThroughInferenceOptions }), z.object({ text_embedding: MlTextEmbeddingInferenceOptions }), z.object({ text_expansion: MlTextExpansionInferenceOptions }), z.object({ question_answering: MlQuestionAnsweringInferenceOptions })])

/** Inference configuration provided when storing the model config */
export const MlInferenceConfigCreateContainer = MlInferenceConfigCreateContainerExclusiveProps.meta({ id: 'MlInferenceConfigCreateContainer' })
export type MlInferenceConfigCreateContainer = z.infer<typeof MlInferenceConfigCreateContainer>

export const MlTextClassificationInferenceUpdateOptions = z.object({
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  tokenization: MlNlpTokenizationUpdateOptions.describe('The tokenization options to update when inferring').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  classification_labels: z.array(z.string()).describe('Classification labels to apply other than the stored labels. Must have the same deminsions as the default configured labels').optional()
}).meta({ id: 'MlTextClassificationInferenceUpdateOptions' })
export type MlTextClassificationInferenceUpdateOptions = z.infer<typeof MlTextClassificationInferenceUpdateOptions>

export const MlZeroShotClassificationInferenceUpdateOptions = z.object({
  tokenization: MlNlpTokenizationUpdateOptions.describe('The tokenization options to update when inferring').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  multi_label: z.boolean().describe('Update the configured multi label option. Indicates if more than one true label exists. Defaults to the configured value.').optional(),
  labels: z.array(z.string()).describe('The labels to predict.')
}).meta({ id: 'MlZeroShotClassificationInferenceUpdateOptions' })
export type MlZeroShotClassificationInferenceUpdateOptions = z.infer<typeof MlZeroShotClassificationInferenceUpdateOptions>

export const MlNerInferenceUpdateOptions = z.object({
  tokenization: MlNlpTokenizationUpdateOptions.describe('The tokenization options to update when inferring').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional()
}).meta({ id: 'MlNerInferenceUpdateOptions' })
export type MlNerInferenceUpdateOptions = z.infer<typeof MlNerInferenceUpdateOptions>

export const MlPassThroughInferenceUpdateOptions = z.object({
  tokenization: MlNlpTokenizationUpdateOptions.describe('The tokenization options to update when inferring').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional()
}).meta({ id: 'MlPassThroughInferenceUpdateOptions' })
export type MlPassThroughInferenceUpdateOptions = z.infer<typeof MlPassThroughInferenceUpdateOptions>

export const MlTextEmbeddingInferenceUpdateOptions = z.object({
  tokenization: MlNlpTokenizationUpdateOptions.optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional()
}).meta({ id: 'MlTextEmbeddingInferenceUpdateOptions' })
export type MlTextEmbeddingInferenceUpdateOptions = z.infer<typeof MlTextEmbeddingInferenceUpdateOptions>

export const MlTextExpansionInferenceUpdateOptions = z.object({
  tokenization: MlNlpTokenizationUpdateOptions.optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional()
}).meta({ id: 'MlTextExpansionInferenceUpdateOptions' })
export type MlTextExpansionInferenceUpdateOptions = z.infer<typeof MlTextExpansionInferenceUpdateOptions>

export const MlQuestionAnsweringInferenceUpdateOptions = z.object({
  question: z.string().describe('The question to answer given the inference context'),
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  tokenization: MlNlpTokenizationUpdateOptions.describe('The tokenization options to update when inferring').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  max_answer_length: integer.describe('The maximum answer length to consider for extraction').optional()
}).meta({ id: 'MlQuestionAnsweringInferenceUpdateOptions' })
export type MlQuestionAnsweringInferenceUpdateOptions = z.infer<typeof MlQuestionAnsweringInferenceUpdateOptions>

const MlInferenceConfigUpdateContainerExclusiveProps = z.union([z.object({ regression: z.lazy(() => MlRegressionInferenceOptions) }), z.object({ classification: z.lazy(() => MlClassificationInferenceOptions) }), z.object({ text_classification: MlTextClassificationInferenceUpdateOptions }), z.object({ zero_shot_classification: MlZeroShotClassificationInferenceUpdateOptions }), z.object({ fill_mask: MlFillMaskInferenceUpdateOptions }), z.object({ ner: MlNerInferenceUpdateOptions }), z.object({ pass_through: MlPassThroughInferenceUpdateOptions }), z.object({ text_embedding: MlTextEmbeddingInferenceUpdateOptions }), z.object({ text_expansion: MlTextExpansionInferenceUpdateOptions }), z.object({ question_answering: MlQuestionAnsweringInferenceUpdateOptions })])

export const MlInferenceConfigUpdateContainer = MlInferenceConfigUpdateContainerExclusiveProps.meta({ id: 'MlInferenceConfigUpdateContainer' })
export type MlInferenceConfigUpdateContainer = z.infer<typeof MlInferenceConfigUpdateContainer>

export const MlTrainedModelEntities = z.object({
  class_name: z.string(),
  class_probability: double,
  entity: z.string(),
  start_pos: integer,
  end_pos: integer
}).meta({ id: 'MlTrainedModelEntities' })
export type MlTrainedModelEntities = z.infer<typeof MlTrainedModelEntities>

export const MlPredictedValue = z.union([ScalarValue, z.array(ScalarValue)]).meta({ id: 'MlPredictedValue' })
export type MlPredictedValue = z.infer<typeof MlPredictedValue>

export const MlTopClassEntry = z.object({
  class_name: z.string(),
  class_probability: double,
  class_score: double
}).meta({ id: 'MlTopClassEntry' })
export type MlTopClassEntry = z.infer<typeof MlTopClassEntry>

export const MlTrainedModelInferenceClassImportance = z.object({
  class_name: z.string(),
  importance: double
}).meta({ id: 'MlTrainedModelInferenceClassImportance' })
export type MlTrainedModelInferenceClassImportance = z.infer<typeof MlTrainedModelInferenceClassImportance>

export const MlTrainedModelInferenceFeatureImportance = z.object({
  feature_name: z.string(),
  importance: double.optional(),
  classes: z.array(MlTrainedModelInferenceClassImportance).optional()
}).meta({ id: 'MlTrainedModelInferenceFeatureImportance' })
export type MlTrainedModelInferenceFeatureImportance = z.infer<typeof MlTrainedModelInferenceFeatureImportance>

export const MlInferenceResponseResult = z.object({
  entities: z.array(MlTrainedModelEntities).describe('If the model is trained for named entity recognition (NER) tasks, the response contains the recognized entities.').optional(),
  is_truncated: z.boolean().describe('Indicates whether the input text was truncated to meet the model\'s maximum sequence length limit. This property is present only when it is true.').optional(),
  predicted_value: z.union([MlPredictedValue, z.array(MlPredictedValue)]).describe('If the model is trained for a text classification or zero shot classification task, the response is the predicted class. For named entity recognition (NER) tasks, it contains the annotated text output. For fill mask tasks, it contains the top prediction for replacing the mask token. For text embedding tasks, it contains the raw numerical text embedding values. For regression models, its a numerical value For classification models, it may be an integer, double, boolean or string depending on prediction type').optional(),
  predicted_value_sequence: z.string().describe('For fill mask tasks, the response contains the input text sequence with the mask token replaced by the predicted value. Additionally').optional(),
  prediction_probability: double.describe('Specifies a probability for the predicted value.').optional(),
  prediction_score: double.describe('Specifies a confidence score for the predicted value.').optional(),
  top_classes: z.array(MlTopClassEntry).describe('For fill mask, text classification, and zero shot classification tasks, the response contains a list of top class entries.').optional(),
  warning: z.string().describe('If the request failed, the response contains the reason for the failure.').optional(),
  feature_importance: z.array(MlTrainedModelInferenceFeatureImportance).describe('The feature importance for the inference results. Relevant only for classification or regression models').optional()
}).meta({ id: 'MlInferenceResponseResult' })
export type MlInferenceResponseResult = z.infer<typeof MlInferenceResponseResult>

export const MlInfluencer = z.object({
  bucket_span: DurationValue.describe('The length of the bucket in seconds. This value matches the bucket span that is specified in the job.'),
  influencer_score: double.describe('A normalized score between 0-100, which is based on the probability of the influencer in this bucket aggregated across detectors. Unlike `initial_influencer_score`, this value is updated by a re-normalization process as new data is analyzed.'),
  influencer_field_name: Field.describe('The field name of the influencer.'),
  influencer_field_value: z.string().describe('The entity that influenced, contributed to, or was to blame for the anomaly.'),
  initial_influencer_score: double.describe('A normalized score between 0-100, which is based on the probability of the influencer aggregated across detectors. This is the initial value that was calculated at the time the bucket was processed.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  job_id: Id.describe('Identifier for the anomaly detection job.'),
  probability: double.describe('The probability that the influencer has this behavior, in the range 0 to 1. This value can be held to a high precision of over 300 decimal places, so the `influencer_score` is provided as a human-readable and friendly interpretation of this value.'),
  result_type: z.string().describe('Internal. This value is always set to `influencer`.'),
  timestamp: EpochTime.describe('The start time of the bucket for which these results were calculated.'),
  foo: z.string().describe('Additional influencer properties are added, depending on the fields being analyzed. For example, if it’s analyzing `user_name` as an influencer, a field `user_name` is added to the result document. This information enables you to filter the anomaly results more easily.').optional()
}).meta({ id: 'MlInfluencer' })
export type MlInfluencer = z.infer<typeof MlInfluencer>

export const MlJobBlockedReason = z.enum(['delete', 'reset', 'revert']).meta({ id: 'MlJobBlockedReason' })
export type MlJobBlockedReason = z.infer<typeof MlJobBlockedReason>

export const MlJobBlocked = z.object({
  reason: MlJobBlockedReason,
  task_id: TaskId.optional()
}).meta({ id: 'MlJobBlocked' })
export type MlJobBlocked = z.infer<typeof MlJobBlocked>

export const MlModelPlotConfig = z.object({
  annotations_enabled: z.boolean().describe('If true, enables calculation and storage of the model change annotations for each entity that is being analyzed.').optional(),
  enabled: z.boolean().describe('If true, enables calculation and storage of the model bounds for each entity that is being analyzed.').optional(),
  terms: Field.describe('Limits data collection to this comma separated list of partition or by field values. If terms are not specified or it is an empty string, no filtering is applied. Wildcards are not supported. Only the specified terms can be viewed when using the Single Metric Viewer.').optional()
}).meta({ id: 'MlModelPlotConfig' })
export type MlModelPlotConfig = z.infer<typeof MlModelPlotConfig>

export const MlJob = z.object({
  allow_lazy_open: z.boolean().describe('Advanced configuration option. Specifies whether this job can open when there is insufficient machine learning node capacity for it to be immediately assigned to a node.'),
  analysis_config: MlAnalysisConfig.describe('The analysis configuration, which specifies how to analyze the data. After you create a job, you cannot change the analysis configuration; all the properties are informational.'),
  analysis_limits: MlAnalysisLimits.describe('Limits can be applied for the resources required to hold the mathematical models in memory. These limits are approximate and can be set per job. They do not control the memory used by other processes, for example the Elasticsearch Java processes.').optional(),
  background_persist_interval: Duration.describe('Advanced configuration option. The time between each periodic persistence of the model. The default value is a randomized value between 3 to 4 hours, which avoids all jobs persisting at exactly the same time. The smallest allowed value is 1 hour.').optional(),
  blocked: MlJobBlocked.optional(),
  create_time: DateTime.optional(),
  custom_settings: MlCustomSettings.describe('Advanced configuration option. Contains custom metadata about the job.').optional(),
  daily_model_snapshot_retention_after_days: long.describe('Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies a period of time (in days) after which only the first snapshot per day is retained. This period is relative to the timestamp of the most recent snapshot for this job. Valid values range from 0 to `model_snapshot_retention_days`.').optional(),
  data_description: MlDataDescription.describe('The data description defines the format of the input data when you send data to the job by using the post data API. Note that when configuring a datafeed, these properties are automatically set. When data is received via the post data API, it is not stored in Elasticsearch. Only the results for anomaly detection are retained.'),
  datafeed_config: MlDatafeed.describe('The datafeed, which retrieves data from Elasticsearch for analysis by the job. You can associate only one datafeed with each anomaly detection job.').optional(),
  deleting: z.boolean().describe('Indicates that the process of deleting the job is in progress but not yet completed. It is only reported when `true`.').optional(),
  description: z.string().describe('A description of the job.').optional(),
  finished_time: DateTime.describe('If the job closed or failed, this is the time the job finished, otherwise it is `null`. This property is informational; you cannot change its value.').optional(),
  groups: z.array(z.string()).describe('A list of job groups. A job can belong to no groups or many.').optional(),
  job_id: Id.describe('Identifier for the anomaly detection job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.'),
  job_type: z.string().describe('Reserved for future use, currently set to `anomaly_detector`.').optional(),
  job_version: VersionString.describe('The machine learning configuration version number at which the the job was created.').optional(),
  model_plot_config: MlModelPlotConfig.describe('This advanced configuration option stores model information along with the results. It provides a more detailed view into anomaly detection. Model plot provides a simplified and indicative view of the model and its bounds.').optional(),
  model_snapshot_id: Id.optional(),
  model_snapshot_retention_days: long.describe('Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies the maximum period of time (in days) that snapshots are retained. This period is relative to the timestamp of the most recent snapshot for this job. By default, snapshots ten days older than the newest snapshot are deleted.'),
  renormalization_window_days: long.describe('Advanced configuration option. The period over which adjustments to the score are applied, as new data is seen. The default value is the longer of 30 days or 100 `bucket_spans`.').optional(),
  results_index_name: IndexName.describe('A text string that affects the name of the machine learning results index. The default value is `shared`, which generates an index named `.ml-anomalies-shared`.'),
  results_retention_days: long.describe('Advanced configuration option. The period of time (in days) that results are retained. Age is calculated relative to the timestamp of the latest bucket result. If this property has a non-null value, once per day at 00:30 (server time), results that are the specified number of days older than the latest bucket result are deleted from Elasticsearch. The default value is null, which means all results are retained. Annotations generated by the system also count as results for retention purposes; they are deleted after the same number of days as results. Annotations added by users are retained forever.').optional()
}).meta({ id: 'MlJob' })
export type MlJob = z.infer<typeof MlJob>

export const MlJobConfig = z.object({
  allow_lazy_open: z.boolean().describe('Advanced configuration option. Specifies whether this job can open when there is insufficient machine learning node capacity for it to be immediately assigned to a node.').optional(),
  analysis_config: MlAnalysisConfig.describe('The analysis configuration, which specifies how to analyze the data. After you create a job, you cannot change the analysis configuration; all the properties are informational.'),
  analysis_limits: MlAnalysisLimits.describe('Limits can be applied for the resources required to hold the mathematical models in memory. These limits are approximate and can be set per job. They do not control the memory used by other processes, for example the Elasticsearch Java processes.').optional(),
  background_persist_interval: Duration.describe('Advanced configuration option. The time between each periodic persistence of the model. The default value is a randomized value between 3 to 4 hours, which avoids all jobs persisting at exactly the same time. The smallest allowed value is 1 hour.').optional(),
  custom_settings: MlCustomSettings.describe('Advanced configuration option. Contains custom metadata about the job.').optional(),
  daily_model_snapshot_retention_after_days: long.describe('Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies a period of time (in days) after which only the first snapshot per day is retained. This period is relative to the timestamp of the most recent snapshot for this job.').optional(),
  data_description: MlDataDescription.describe('The data description defines the format of the input data when you send data to the job by using the post data API. Note that when configure a datafeed, these properties are automatically set.'),
  datafeed_config: MlDatafeedConfig.describe('The datafeed, which retrieves data from Elasticsearch for analysis by the job. You can associate only one datafeed with each anomaly detection job.').optional(),
  description: z.string().describe('A description of the job.').optional(),
  groups: z.array(z.string()).describe('A list of job groups. A job can belong to no groups or many.').optional(),
  job_id: Id.describe('Identifier for the anomaly detection job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').optional(),
  model_plot_config: MlModelPlotConfig.describe('This advanced configuration option stores model information along with the results. It provides a more detailed view into anomaly detection. Model plot provides a simplified and indicative view of the model and its bounds.').optional(),
  model_snapshot_retention_days: long.describe('Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies the maximum period of time (in days) that snapshots are retained. This period is relative to the timestamp of the most recent snapshot for this job. The default value is `10`, which means snapshots ten days older than the newest snapshot are deleted.').optional(),
  renormalization_window_days: long.describe('Advanced configuration option. The period over which adjustments to the score are applied, as new data is seen. The default value is the longer of 30 days or 100 `bucket_spans`.').optional(),
  results_index_name: IndexName.describe('A text string that affects the name of the machine learning results index. The default value is `shared`, which generates an index named `.ml-anomalies-shared`.').optional(),
  results_retention_days: long.describe('Advanced configuration option. The period of time (in days) that results are retained. Age is calculated relative to the timestamp of the latest bucket result. If this property has a non-null value, once per day at 00:30 (server time), results that are the specified number of days older than the latest bucket result are deleted from Elasticsearch. The default value is null, which means all results are retained. Annotations generated by the system also count as results for retention purposes; they are deleted after the same number of days as results. Annotations added by users are retained forever.').optional()
}).meta({ id: 'MlJobConfig' })
export type MlJobConfig = z.infer<typeof MlJobConfig>

export const MlJobStatistics = z.object({
  avg: double,
  max: double,
  min: double,
  total: double
}).meta({ id: 'MlJobStatistics' })
export type MlJobStatistics = z.infer<typeof MlJobStatistics>

export const MlJobForecastStatistics = z.object({
  memory_bytes: MlJobStatistics.optional(),
  processing_time_ms: MlJobStatistics.optional(),
  records: MlJobStatistics.optional(),
  status: z.record(z.string(), long).optional(),
  total: long,
  forecasted_jobs: integer
}).meta({ id: 'MlJobForecastStatistics' })
export type MlJobForecastStatistics = z.infer<typeof MlJobForecastStatistics>

export const MlModelSizeStats = z.object({
  bucket_allocation_failures_count: long,
  job_id: Id,
  log_time: DateTime,
  memory_status: MlMemoryStatus,
  model_bytes: ByteSize,
  model_bytes_exceeded: ByteSize.optional(),
  model_bytes_memory_limit: ByteSize.optional(),
  output_memory_allocator_bytes: ByteSize.optional(),
  peak_model_bytes: ByteSize.optional(),
  assignment_memory_basis: z.string().optional(),
  result_type: z.string(),
  total_by_field_count: long,
  total_over_field_count: long,
  total_partition_field_count: long,
  categorization_status: MlCategorizationStatus,
  categorized_doc_count: integer,
  dead_category_count: integer,
  failed_category_count: integer,
  frequent_category_count: integer,
  rare_category_count: integer,
  total_category_count: integer,
  timestamp: long.optional()
}).meta({ id: 'MlModelSizeStats' })
export type MlModelSizeStats = z.infer<typeof MlModelSizeStats>

export const MlJobTimingStats = z.object({
  average_bucket_processing_time_ms: DurationValue.optional(),
  bucket_count: long,
  exponential_average_bucket_processing_time_ms: DurationValue.optional(),
  exponential_average_bucket_processing_time_per_hour_ms: DurationValue,
  job_id: Id,
  total_bucket_processing_time_ms: DurationValue,
  maximum_bucket_processing_time_ms: DurationValue.optional(),
  minimum_bucket_processing_time_ms: DurationValue.optional()
}).meta({ id: 'MlJobTimingStats' })
export type MlJobTimingStats = z.infer<typeof MlJobTimingStats>

export const MlJobStats = z.object({
  assignment_explanation: z.string().describe('For open anomaly detection jobs only, contains messages relating to the selection of a node to run the job.').optional(),
  data_counts: MlDataCounts.describe('An object that describes the quantity of input to the job and any related error counts. The `data_count` values are cumulative for the lifetime of a job. If a model snapshot is reverted or old results are deleted, the job counts are not reset.'),
  forecasts_stats: MlJobForecastStatistics.describe('An object that provides statistical information about forecasts belonging to this job. Some statistics are omitted if no forecasts have been made.'),
  job_id: z.string().describe('Identifier for the anomaly detection job.'),
  model_size_stats: MlModelSizeStats.describe('An object that provides information about the size and contents of the model.'),
  open_time: DateTime.describe('For open jobs only, the elapsed time for which the job has been open.').optional(),
  state: MlJobState.describe('The status of the anomaly detection job, which can be one of the following values: `closed`, `closing`, `failed`, `opened`, `opening`.'),
  timing_stats: MlJobTimingStats.describe('An object that provides statistical information about timing aspect of this job.'),
  deleting: z.boolean().describe('Indicates that the process of deleting the job is in progress but not yet completed. It is only reported when `true`.').optional()
}).meta({ id: 'MlJobStats' })
export type MlJobStats = z.infer<typeof MlJobStats>

export const MlTrainedModelPrefixStrings = z.object({
  ingest: z.string().describe('String prepended to input at ingest').optional(),
  search: z.string().describe('String prepended to input at search').optional()
}).meta({ id: 'MlTrainedModelPrefixStrings' })
export type MlTrainedModelPrefixStrings = z.infer<typeof MlTrainedModelPrefixStrings>

export const MlModelPackageConfig = z.object({
  create_time: EpochTime.optional(),
  description: z.string().optional(),
  inference_config: z.record(z.string(), z.any()).optional(),
  metadata: Metadata.optional(),
  minimum_version: z.string().optional(),
  model_repository: z.string().optional(),
  model_type: z.string().optional(),
  packaged_model_id: Id,
  platform_architecture: z.string().optional(),
  prefix_strings: MlTrainedModelPrefixStrings.optional(),
  size: ByteSize.optional(),
  sha256: z.string().optional(),
  tags: z.array(z.string()).optional(),
  vocabulary_file: z.string().optional()
}).meta({ id: 'MlModelPackageConfig' })
export type MlModelPackageConfig = z.infer<typeof MlModelPackageConfig>

export const MlModelSnapshot = z.object({
  description: z.string().describe('An optional description of the job.').optional(),
  job_id: Id.describe('A numerical character string that uniquely identifies the job that the snapshot was created for.'),
  latest_record_time_stamp: integer.describe('The timestamp of the latest processed record.').optional(),
  latest_result_time_stamp: integer.describe('The timestamp of the latest bucket result.').optional(),
  min_version: VersionString.describe('The minimum version required to be able to restore the model snapshot.'),
  model_size_stats: MlModelSizeStats.describe('Summary information describing the model.').optional(),
  retain: z.boolean().describe('If true, this snapshot will not be deleted during automatic cleanup of snapshots older than model_snapshot_retention_days. However, this snapshot will be deleted when the job is deleted. The default value is false.'),
  snapshot_doc_count: long.describe('For internal use only.'),
  snapshot_id: Id.describe('A numerical character string that uniquely identifies the model snapshot.'),
  timestamp: long.describe('The creation timestamp for the snapshot.')
}).meta({ id: 'MlModelSnapshot' })
export type MlModelSnapshot = z.infer<typeof MlModelSnapshot>

export const MlSnapshotUpgradeState = z.enum(['loading_old_state', 'saving_new_state', 'stopped', 'failed']).meta({ id: 'MlSnapshotUpgradeState' })
export type MlSnapshotUpgradeState = z.infer<typeof MlSnapshotUpgradeState>

export const MlModelSnapshotUpgrade = z.object({
  job_id: Id,
  snapshot_id: Id,
  state: MlSnapshotUpgradeState,
  assignment_explanation: z.string()
}).meta({ id: 'MlModelSnapshotUpgrade' })
export type MlModelSnapshotUpgrade = z.infer<typeof MlModelSnapshotUpgrade>

export const MlOverallBucketJob = z.object({
  job_id: Id,
  max_anomaly_score: double
}).meta({ id: 'MlOverallBucketJob' })
export type MlOverallBucketJob = z.infer<typeof MlOverallBucketJob>

export const MlOverallBucket = z.object({
  bucket_span: DurationValue.describe('The length of the bucket in seconds. Matches the job with the longest bucket_span value.'),
  is_interim: z.boolean().describe('If true, this is an interim result. In other words, the results are calculated based on partial input data.'),
  jobs: z.array(MlOverallBucketJob).describe('An array of objects that contain the max_anomaly_score per job_id.'),
  overall_score: double.describe('The top_n average of the maximum bucket anomaly_score per job.'),
  result_type: z.string().describe('Internal. This is always set to overall_bucket.'),
  timestamp: EpochTime.describe('The start time of the bucket for which these results were calculated.'),
  timestamp_string: DateTime.describe('The start time of the bucket for which these results were calculated.').optional()
}).meta({ id: 'MlOverallBucket' })
export type MlOverallBucket = z.infer<typeof MlOverallBucket>

export const MlPage = z.object({
  from: integer.describe('Skips the specified number of items.').optional(),
  size: integer.describe('Specifies the maximum number of items to obtain.').optional()
}).meta({ id: 'MlPage' })
export type MlPage = z.infer<typeof MlPage>

export const MlRoutingState = z.enum(['failed', 'started', 'starting', 'stopped', 'stopping']).meta({ id: 'MlRoutingState' })
export type MlRoutingState = z.infer<typeof MlRoutingState>

export const MlTotalFeatureImportanceStatistics = z.object({
  mean_magnitude: double.describe('The average magnitude of this feature across all the training data. This value is the average of the absolute values of the importance for this feature.'),
  max: integer.describe('The maximum importance value across all the training data for this feature.'),
  min: integer.describe('The minimum importance value across all the training data for this feature.')
}).meta({ id: 'MlTotalFeatureImportanceStatistics' })
export type MlTotalFeatureImportanceStatistics = z.infer<typeof MlTotalFeatureImportanceStatistics>

export const MlTotalFeatureImportanceClass = z.object({
  class_name: Name.describe('The target class value. Could be a string, boolean, or number.'),
  importance: z.array(MlTotalFeatureImportanceStatistics).describe('A collection of feature importance statistics related to the training data set for this particular feature.')
}).meta({ id: 'MlTotalFeatureImportanceClass' })
export type MlTotalFeatureImportanceClass = z.infer<typeof MlTotalFeatureImportanceClass>

export const MlTotalFeatureImportance = z.object({
  feature_name: Name.describe('The feature for which this importance was calculated.'),
  importance: z.array(MlTotalFeatureImportanceStatistics).describe('A collection of feature importance statistics related to the training data set for this particular feature.'),
  classes: z.array(MlTotalFeatureImportanceClass).describe('If the trained model is a classification model, feature importance statistics are gathered per target class value.')
}).meta({ id: 'MlTotalFeatureImportance' })
export type MlTotalFeatureImportance = z.infer<typeof MlTotalFeatureImportance>

export const MlTrainedModelAssignmentRoutingTable = z.object({
  reason: z.string().describe('The reason for the current state. It is usually populated only when the `routing_state` is `failed`.').optional(),
  routing_state: MlRoutingState.describe('The current routing state.'),
  current_allocations: integer.describe('Current number of allocations.'),
  target_allocations: integer.describe('Target number of allocations.')
}).meta({ id: 'MlTrainedModelAssignmentRoutingTable' })
export type MlTrainedModelAssignmentRoutingTable = z.infer<typeof MlTrainedModelAssignmentRoutingTable>

export const MlTrainingPriority = z.enum(['normal', 'low']).meta({ id: 'MlTrainingPriority' })
export type MlTrainingPriority = z.infer<typeof MlTrainingPriority>

export const MlTrainedModelAssignmentTaskParameters = z.object({
  model_bytes: ByteSize.describe('The size of the trained model in bytes.'),
  model_id: Id.describe('The unique identifier for the trained model.'),
  deployment_id: Id.describe('The unique identifier for the trained model deployment.'),
  cache_size: ByteSize.describe('The size of the trained model cache.').optional(),
  number_of_allocations: integer.describe('The total number of allocations this model is assigned across ML nodes.'),
  priority: MlTrainingPriority,
  per_deployment_memory_bytes: ByteSize,
  per_allocation_memory_bytes: ByteSize,
  queue_capacity: integer.describe('Number of inference requests are allowed in the queue at a time.'),
  threads_per_allocation: integer.describe('Number of threads per allocation.')
}).meta({ id: 'MlTrainedModelAssignmentTaskParameters' })
export type MlTrainedModelAssignmentTaskParameters = z.infer<typeof MlTrainedModelAssignmentTaskParameters>

export const MlTrainedModelAssignment = z.object({
  adaptive_allocations: z.union([MlAdaptiveAllocationsSettings, z.null()]).optional(),
  assignment_state: MlDeploymentAssignmentState.describe('The overall assignment state.'),
  max_assigned_allocations: integer.optional(),
  reason: z.string().optional(),
  routing_table: z.record(z.string(), MlTrainedModelAssignmentRoutingTable).describe('The allocation state for each node.'),
  start_time: DateTime.describe('The timestamp when the deployment started.'),
  task_parameters: MlTrainedModelAssignmentTaskParameters
}).meta({ id: 'MlTrainedModelAssignment' })
export type MlTrainedModelAssignment = z.infer<typeof MlTrainedModelAssignment>

export const MlTrainedModelAssignmentRoutingStateAndReason = z.object({
  reason: z.string().describe('The reason for the current state. It is usually populated only when the `routing_state` is `failed`.').optional(),
  routing_state: MlRoutingState.describe('The current routing state.')
}).meta({ id: 'MlTrainedModelAssignmentRoutingStateAndReason' })
export type MlTrainedModelAssignmentRoutingStateAndReason = z.infer<typeof MlTrainedModelAssignmentRoutingStateAndReason>

export const MlTrainedModelType = z.enum(['tree_ensemble', 'lang_ident', 'pytorch']).meta({ id: 'MlTrainedModelType' })
export type MlTrainedModelType = z.infer<typeof MlTrainedModelType>

export const MlTrainedModelConfigInput = z.object({
  field_names: z.array(Field).describe('An array of input field names for the model.')
}).meta({ id: 'MlTrainedModelConfigInput' })
export type MlTrainedModelConfigInput = z.infer<typeof MlTrainedModelConfigInput>

export const MlTrainedModelConfigMetadata = z.object({
  model_aliases: z.array(z.string()).optional(),
  feature_importance_baseline: z.record(z.string(), z.string()).describe('An object that contains the baseline for feature importance values. For regression analysis, it is a single value. For classification analysis, there is a value for each class.').optional(),
  hyperparameters: z.array(MlHyperparameter).describe('List of the available hyperparameters optimized during the fine_parameter_tuning phase as well as specified by the user.').optional(),
  total_feature_importance: z.array(MlTotalFeatureImportance).describe('An array of the total feature importance for each feature used from the training data set. This array of objects is returned if data frame analytics trained the model and the request includes total_feature_importance in the include request parameter.').optional()
}).meta({ id: 'MlTrainedModelConfigMetadata' })
export type MlTrainedModelConfigMetadata = z.infer<typeof MlTrainedModelConfigMetadata>

export const MlTrainedModelLocationIndex = z.object({
  name: IndexName
}).meta({ id: 'MlTrainedModelLocationIndex' })
export type MlTrainedModelLocationIndex = z.infer<typeof MlTrainedModelLocationIndex>

export const MlTrainedModelLocation = z.object({
  index: MlTrainedModelLocationIndex
}).meta({ id: 'MlTrainedModelLocation' })
export type MlTrainedModelLocation = z.infer<typeof MlTrainedModelLocation>

export const MlTrainedModelConfig = z.object({
  model_id: Id.describe('Identifier for the trained model.'),
  model_type: MlTrainedModelType.describe('The model type').optional(),
  tags: z.array(z.string()).describe('A comma delimited string of tags. A trained model can have many tags, or none.'),
  version: VersionString.describe('The Elasticsearch version number in which the trained model was created.').optional(),
  compressed_definition: z.string().optional(),
  created_by: z.string().describe('Information on the creator of the trained model.').optional(),
  create_time: DateTime.describe('The time when the trained model was created.').optional(),
  default_field_map: z.record(z.string(), z.string()).describe('Any field map described in the inference configuration takes precedence.').optional(),
  description: z.string().describe('The free-text description of the trained model.').optional(),
  estimated_heap_memory_usage_bytes: integer.describe('The estimated heap usage in bytes to keep the trained model in memory.').optional(),
  estimated_operations: integer.describe('The estimated number of operations to use the trained model.').optional(),
  fully_defined: z.boolean().describe('True if the full model definition is present.').optional(),
  inference_config: MlInferenceConfigCreateContainer.describe('The default configuration for inference. This can be either a regression, classification, or one of the many NLP focused configurations. It must match the underlying definition.trained_model\'s target_type. For pre-packaged models such as ELSER the config is not required.').optional(),
  input: MlTrainedModelConfigInput.describe('The input field names for the model definition.'),
  license_level: z.string().describe('The license level of the trained model.').optional(),
  metadata: MlTrainedModelConfigMetadata.describe('An object containing metadata about the trained model. For example, models created by data frame analytics contain analysis_config and input objects.').optional(),
  model_size_bytes: ByteSize.optional(),
  model_package: MlModelPackageConfig.optional(),
  location: MlTrainedModelLocation.optional(),
  platform_architecture: z.string().optional(),
  prefix_strings: MlTrainedModelPrefixStrings.optional()
}).meta({ id: 'MlTrainedModelConfig' })
export type MlTrainedModelConfig = z.infer<typeof MlTrainedModelConfig>

export const MlTrainedModelDeploymentAllocationStatus = z.object({
  allocation_count: integer.describe('The current number of nodes where the model is allocated.'),
  state: MlDeploymentAllocationState.describe('The detailed allocation state related to the nodes.'),
  target_allocation_count: integer.describe('The desired number of nodes for model allocation.')
}).meta({ id: 'MlTrainedModelDeploymentAllocationStatus' })
export type MlTrainedModelDeploymentAllocationStatus = z.infer<typeof MlTrainedModelDeploymentAllocationStatus>

export const MlTrainedModelDeploymentNodesStats = z.object({
  average_inference_time_ms: DurationValue.describe('The average time for each inference call to complete on this node.').optional(),
  average_inference_time_ms_last_minute: DurationValue.optional(),
  average_inference_time_ms_excluding_cache_hits: DurationValue.describe('The average time for each inference call to complete on this node, excluding cache').optional(),
  error_count: integer.describe('The number of errors when evaluating the trained model.').optional(),
  inference_count: long.describe('The total number of inference calls made against this node for this model.').optional(),
  inference_cache_hit_count: long.optional(),
  inference_cache_hit_count_last_minute: long.optional(),
  last_access: EpochTime.describe('The epoch time stamp of the last inference call for the model on this node.').optional(),
  number_of_allocations: integer.describe('The number of allocations assigned to this node.').optional(),
  number_of_pending_requests: integer.describe('The number of inference requests queued to be processed.').optional(),
  peak_throughput_per_minute: long,
  rejected_execution_count: integer.describe('The number of inference requests that were not processed because the queue was full.').optional(),
  routing_state: MlTrainedModelAssignmentRoutingStateAndReason.describe('The current routing state and reason for the current routing state for this allocation.'),
  start_time: EpochTime.describe('The epoch timestamp when the allocation started.').optional(),
  threads_per_allocation: integer.describe('The number of threads used by each allocation during inference.').optional(),
  throughput_last_minute: integer,
  timeout_count: integer.describe('The number of inference requests that timed out before being processed.').optional()
}).meta({ id: 'MlTrainedModelDeploymentNodesStats' })
export type MlTrainedModelDeploymentNodesStats = z.infer<typeof MlTrainedModelDeploymentNodesStats>

export const MlTrainedModelDeploymentStats = z.object({
  adaptive_allocations: MlAdaptiveAllocationsSettings.optional(),
  allocation_status: MlTrainedModelDeploymentAllocationStatus.describe('The detailed allocation status for the deployment.').optional(),
  cache_size: ByteSize.optional(),
  deployment_id: Id.describe('The unique identifier for the trained model deployment.'),
  error_count: integer.describe('The sum of `error_count` for all nodes in the deployment.').optional(),
  inference_count: integer.describe('The sum of `inference_count` for all nodes in the deployment.').optional(),
  model_id: Id.describe('The unique identifier for the trained model.'),
  nodes: z.array(MlTrainedModelDeploymentNodesStats).describe('The deployment stats for each node that currently has the model allocated. In serverless, stats are reported for a single unnamed virtual node.'),
  number_of_allocations: integer.describe('The number of allocations requested.').optional(),
  peak_throughput_per_minute: long,
  priority: MlTrainingPriority,
  queue_capacity: integer.describe('The number of inference requests that can be queued before new requests are rejected.').optional(),
  rejected_execution_count: integer.describe('The sum of `rejected_execution_count` for all nodes in the deployment. Individual nodes reject an inference request if the inference queue is full. The queue size is controlled by the `queue_capacity` setting in the start trained model deployment API.').optional(),
  reason: z.string().describe('The reason for the current deployment state. Usually only populated when the model is not deployed to a node.').optional(),
  start_time: EpochTime.describe('The epoch timestamp when the deployment started.'),
  state: MlDeploymentAssignmentState.describe('The overall state of the deployment.').optional(),
  threads_per_allocation: integer.describe('The number of threads used be each allocation during inference.').optional(),
  timeout_count: integer.describe('The sum of `timeout_count` for all nodes in the deployment.').optional()
}).meta({ id: 'MlTrainedModelDeploymentStats' })
export type MlTrainedModelDeploymentStats = z.infer<typeof MlTrainedModelDeploymentStats>

export const MlTrainedModelInferenceStats = z.object({
  cache_miss_count: integer.describe('The number of times the model was loaded for inference and was not retrieved from the cache. If this number is close to the `inference_count`, the cache is not being appropriately used. This can be solved by increasing the cache size or its time-to-live (TTL). Refer to general machine learning settings for the appropriate settings.'),
  failure_count: integer.describe('The number of failures when using the model for inference.'),
  inference_count: integer.describe('The total number of times the model has been called for inference. This is across all inference contexts, including all pipelines.'),
  missing_all_fields_count: integer.describe('The number of inference calls where all the training features for the model were missing.'),
  timestamp: EpochTime.describe('The time when the statistics were last updated.')
}).meta({ id: 'MlTrainedModelInferenceStats' })
export type MlTrainedModelInferenceStats = z.infer<typeof MlTrainedModelInferenceStats>

export const MlTrainedModelSizeStats = z.object({
  model_size_bytes: ByteSize.describe('The size of the model in bytes.'),
  required_native_memory_bytes: ByteSize.describe('The amount of memory required to load the model in bytes.')
}).meta({ id: 'MlTrainedModelSizeStats' })
export type MlTrainedModelSizeStats = z.infer<typeof MlTrainedModelSizeStats>

export const MlTrainedModelStats = z.object({
  deployment_stats: MlTrainedModelDeploymentStats.describe('A collection of deployment stats, which is present when the models are deployed.').optional(),
  inference_stats: MlTrainedModelInferenceStats.describe('A collection of inference stats fields.').optional(),
  ingest: z.record(z.string(), z.any()).describe('A collection of ingest stats for the model across all nodes. The values are summations of the individual node statistics. The format matches the ingest section in the nodes stats API.').optional(),
  model_id: Id.describe('The unique identifier of the trained model.'),
  model_size_stats: MlTrainedModelSizeStats.describe('A collection of model size stats.'),
  pipeline_count: integer.describe('The number of ingest pipelines that currently refer to the model.')
}).meta({ id: 'MlTrainedModelStats' })
export type MlTrainedModelStats = z.infer<typeof MlTrainedModelStats>

export const MlTransformAuthorization = z.object({
  api_key: MlApiKeyAuthorization.describe('If an API key was used for the most recent update to the transform, its name and identifier are listed in the response.').optional(),
  roles: z.array(z.string()).describe('If a user ID was used for the most recent update to the transform, its roles at the time of the update are listed in the response.').optional(),
  service_account: z.string().describe('If a service account was used for the most recent update to the transform, the account name is listed in the response.').optional()
}).meta({ id: 'MlTransformAuthorization' })
export type MlTransformAuthorization = z.infer<typeof MlTransformAuthorization>

/**
 * Clear trained model deployment cache.
 *
 * Cache will be cleared on all nodes where the trained model is assigned.
 * A trained model deployment may have an inference cache enabled.
 * As requests are handled by each allocated node, their responses may be cached on that individual node.
 * Calling this API clears the caches without restarting the deployment.
 */
export const MlClearTrainedModelDeploymentCacheRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' })
}).meta({ id: 'MlClearTrainedModelDeploymentCacheRequest' })
export type MlClearTrainedModelDeploymentCacheRequest = z.infer<typeof MlClearTrainedModelDeploymentCacheRequest>

export const MlClearTrainedModelDeploymentCacheResponse = z.object({
  cleared: z.boolean()
}).meta({ id: 'MlClearTrainedModelDeploymentCacheResponse' })
export type MlClearTrainedModelDeploymentCacheResponse = z.infer<typeof MlClearTrainedModelDeploymentCacheResponse>

/**
 * Close anomaly detection jobs.
 *
 * A job can be opened and closed multiple times throughout its lifecycle. A closed job cannot receive data or perform analysis operations, but you can still explore and navigate results.
 * When you close a job, it runs housekeeping tasks such as pruning the model history, flushing buffers, calculating final results and persisting the model snapshots. Depending upon the size of the job, it could take several minutes to close and the equivalent time to re-open. After it is closed, the job has a minimal overhead on the cluster except for maintaining its meta data. Therefore it is a best practice to close jobs that are no longer required to process data.
 * If you close an anomaly detection job whose datafeed is running, the request first tries to stop the datafeed. This behavior is equivalent to calling stop datafeed API with the same timeout and force parameters as the close job request.
 * When a datafeed that has a specified end date stops, it automatically closes its associated job.
 */
export const MlCloseJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. It can be a job identifier, a group name, or a wildcard expression. You can close multiple anomaly detection jobs in a single API request by using a group name, a comma-separated list of jobs, or a wildcard expression. You can close all jobs by using `_all` or by specifying `*` as the job identifier.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Refer to the description for the `allow_no_match` query parameter.').optional().meta({ found_in: 'body' }),
  force: z.boolean().describe('Refer to the descriptiion for the `force` query parameter.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('Refer to the description for the `timeout` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlCloseJobRequest' })
export type MlCloseJobRequest = z.infer<typeof MlCloseJobRequest>

export const MlCloseJobResponse = z.object({
  closed: z.boolean()
}).meta({ id: 'MlCloseJobResponse' })
export type MlCloseJobResponse = z.infer<typeof MlCloseJobResponse>

/**
 * Delete a calendar.
 *
 * Remove all scheduled events from a calendar, then delete it.
 */
export const MlDeleteCalendarRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').meta({ found_in: 'path' })
}).meta({ id: 'MlDeleteCalendarRequest' })
export type MlDeleteCalendarRequest = z.infer<typeof MlDeleteCalendarRequest>

export const MlDeleteCalendarResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteCalendarResponse' })
export type MlDeleteCalendarResponse = z.infer<typeof MlDeleteCalendarResponse>

/** Delete events from a calendar. */
export const MlDeleteCalendarEventRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').meta({ found_in: 'path' }),
  event_id: Id.describe('Identifier for the scheduled event. You can obtain this identifier by using the get calendar events API.').meta({ found_in: 'path' })
}).meta({ id: 'MlDeleteCalendarEventRequest' })
export type MlDeleteCalendarEventRequest = z.infer<typeof MlDeleteCalendarEventRequest>

export const MlDeleteCalendarEventResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteCalendarEventResponse' })
export type MlDeleteCalendarEventResponse = z.infer<typeof MlDeleteCalendarEventResponse>

/** Delete anomaly jobs from a calendar. */
export const MlDeleteCalendarJobRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').meta({ found_in: 'path' }),
  job_id: Ids.describe('An identifier for the anomaly detection jobs. It can be a job identifier, a group name, or a comma-separated list of jobs or groups.').meta({ found_in: 'path' })
}).meta({ id: 'MlDeleteCalendarJobRequest' })
export type MlDeleteCalendarJobRequest = z.infer<typeof MlDeleteCalendarJobRequest>

export const MlDeleteCalendarJobResponse = z.object({
  calendar_id: Id.describe('A string that uniquely identifies a calendar.'),
  description: z.string().describe('A description of the calendar.').optional(),
  job_ids: Ids.describe('A list of anomaly detection job identifiers or group names.')
}).meta({ id: 'MlDeleteCalendarJobResponse' })
export type MlDeleteCalendarJobResponse = z.infer<typeof MlDeleteCalendarJobResponse>

/** Delete a data frame analytics job. */
export const MlDeleteDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job.').meta({ found_in: 'path' }),
  force: z.boolean().describe('If `true`, it deletes a job that is not stopped; this method is quicker than stopping and deleting the job.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The time to wait for the job to be deleted.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlDeleteDataFrameAnalyticsRequest' })
export type MlDeleteDataFrameAnalyticsRequest = z.infer<typeof MlDeleteDataFrameAnalyticsRequest>

export const MlDeleteDataFrameAnalyticsResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteDataFrameAnalyticsResponse' })
export type MlDeleteDataFrameAnalyticsResponse = z.infer<typeof MlDeleteDataFrameAnalyticsResponse>

/** Delete a datafeed. */
export const MlDeleteDatafeedRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  force: z.boolean().describe('Use to forcefully delete a started datafeed; this method is quicker than stopping and deleting the datafeed.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlDeleteDatafeedRequest' })
export type MlDeleteDatafeedRequest = z.infer<typeof MlDeleteDatafeedRequest>

export const MlDeleteDatafeedResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteDatafeedResponse' })
export type MlDeleteDatafeedResponse = z.infer<typeof MlDeleteDatafeedResponse>

/**
 * Delete expired ML data.
 *
 * Delete all job results, model snapshots and forecast data that have exceeded
 * their retention days period. Machine learning state documents that are not
 * associated with any job are also deleted.
 * You can limit the request to a single or set of anomaly detection jobs by
 * using a job identifier, a group name, a comma-separated list of jobs, or a
 * wildcard expression. You can delete expired data for all anomaly detection
 * jobs by using `_all`, by specifying `*` as the `<job_id>`, or by omitting the
 * `<job_id>`.
 */
export const MlDeleteExpiredDataRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for an anomaly detection job. It can be a job identifier, a group name, or a wildcard expression.').optional().meta({ found_in: 'path' }),
  requests_per_second: float.describe('The desired requests per second for the deletion processes. The default behavior is no throttling.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('How long can the underlying delete processes run until they are canceled.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlDeleteExpiredDataRequest' })
export type MlDeleteExpiredDataRequest = z.infer<typeof MlDeleteExpiredDataRequest>

export const MlDeleteExpiredDataResponse = z.object({
  deleted: z.boolean()
}).meta({ id: 'MlDeleteExpiredDataResponse' })
export type MlDeleteExpiredDataResponse = z.infer<typeof MlDeleteExpiredDataResponse>

/**
 * Delete a filter.
 *
 * If an anomaly detection job references the filter, you cannot delete the
 * filter. You must update or delete the job before you can delete the filter.
 */
export const MlDeleteFilterRequest = z.object({
  ...RequestBase.shape,
  filter_id: Id.describe('A string that uniquely identifies a filter.').meta({ found_in: 'path' })
}).meta({ id: 'MlDeleteFilterRequest' })
export type MlDeleteFilterRequest = z.infer<typeof MlDeleteFilterRequest>

export const MlDeleteFilterResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteFilterResponse' })
export type MlDeleteFilterResponse = z.infer<typeof MlDeleteFilterResponse>

/**
 * Delete forecasts from a job.
 *
 * By default, forecasts are retained for 14 days. You can specify a
 * different retention period with the `expires_in` parameter in the forecast
 * jobs API. The delete forecast API enables you to delete one or more
 * forecasts before they expire.
 */
export const MlDeleteForecastRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  forecast_id: Id.describe('A comma-separated list of forecast identifiers. If you do not specify this optional parameter or if you specify `_all` or `*` the API deletes all forecasts from the job.').optional().meta({ found_in: 'path' }),
  allow_no_forecasts: z.boolean().describe('Specifies whether an error occurs when there are no forecasts. In particular, if this parameter is set to `false` and there are no forecasts associated with the job, attempts to delete all forecasts return an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Specifies the period of time to wait for the completion of the delete operation. When this period of time elapses, the API fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlDeleteForecastRequest' })
export type MlDeleteForecastRequest = z.infer<typeof MlDeleteForecastRequest>

export const MlDeleteForecastResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteForecastResponse' })
export type MlDeleteForecastResponse = z.infer<typeof MlDeleteForecastResponse>

/**
 * Delete an anomaly detection job.
 *
 * All job configuration, model state and results are deleted.
 * It is not currently possible to delete multiple jobs using wildcards or a
 * comma separated list. If you delete a job that has a datafeed, the request
 * first tries to delete the datafeed. This behavior is equivalent to calling
 * the delete datafeed API with the same timeout and force parameters as the
 * delete job request.
 */
export const MlDeleteJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  force: z.boolean().describe('Use to forcefully delete an opened job; this method is quicker than closing and deleting the job.').optional().meta({ found_in: 'query' }),
  delete_user_annotations: z.boolean().describe('Specifies whether annotations that have been added by the user should be deleted along with any auto-generated annotations when the job is reset.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('Specifies whether the request should return immediately or wait until the job deletion completes.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlDeleteJobRequest' })
export type MlDeleteJobRequest = z.infer<typeof MlDeleteJobRequest>

export const MlDeleteJobResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteJobResponse' })
export type MlDeleteJobResponse = z.infer<typeof MlDeleteJobResponse>

/**
 * Delete a model snapshot.
 *
 * You cannot delete the active model snapshot. To delete that snapshot, first
 * revert to a different one. To identify the active model snapshot, refer to
 * the `model_snapshot_id` in the results from the get jobs API.
 */
export const MlDeleteModelSnapshotRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('Identifier for the model snapshot.').meta({ found_in: 'path' })
}).meta({ id: 'MlDeleteModelSnapshotRequest' })
export type MlDeleteModelSnapshotRequest = z.infer<typeof MlDeleteModelSnapshotRequest>

export const MlDeleteModelSnapshotResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteModelSnapshotResponse' })
export type MlDeleteModelSnapshotResponse = z.infer<typeof MlDeleteModelSnapshotResponse>

/**
 * Delete an unreferenced trained model.
 *
 * The request deletes a trained inference model that is not referenced by an ingest pipeline.
 */
export const MlDeleteTrainedModelRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  force: z.boolean().describe('Forcefully deletes a trained model that is referenced by ingest pipelines or has a started deployment.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlDeleteTrainedModelRequest' })
export type MlDeleteTrainedModelRequest = z.infer<typeof MlDeleteTrainedModelRequest>

export const MlDeleteTrainedModelResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteTrainedModelResponse' })
export type MlDeleteTrainedModelResponse = z.infer<typeof MlDeleteTrainedModelResponse>

/**
 * Delete a trained model alias.
 *
 * This API deletes an existing model alias that refers to a trained model. If
 * the model alias is missing or refers to a model other than the one identified
 * by the `model_id`, this API returns an error.
 */
export const MlDeleteTrainedModelAliasRequest = z.object({
  ...RequestBase.shape,
  model_alias: Name.describe('The model alias to delete.').meta({ found_in: 'path' }),
  model_id: Id.describe('The trained model ID to which the model alias refers.').meta({ found_in: 'path' })
}).meta({ id: 'MlDeleteTrainedModelAliasRequest' })
export type MlDeleteTrainedModelAliasRequest = z.infer<typeof MlDeleteTrainedModelAliasRequest>

export const MlDeleteTrainedModelAliasResponse = AcknowledgedResponseBase.meta({ id: 'MlDeleteTrainedModelAliasResponse' })
export type MlDeleteTrainedModelAliasResponse = z.infer<typeof MlDeleteTrainedModelAliasResponse>

/**
 * Estimate job model memory usage.
 *
 * Make an estimation of the memory usage for an anomaly detection job model.
 * The estimate is based on analysis configuration details for the job and cardinality
 * estimates for the fields it references.
 */
export const MlEstimateModelMemoryRequest = z.object({
  ...RequestBase.shape,
  analysis_config: MlAnalysisConfig.describe('For a list of the properties that you can specify in the `analysis_config` component of the body of this API.').optional().meta({ found_in: 'body' }),
  max_bucket_cardinality: z.record(Field, long).describe('Estimates of the highest cardinality in a single bucket that is observed for influencer fields over the time period that the job analyzes data. To produce a good answer, values must be provided for all influencer fields. Providing values for fields that are not listed as `influencers` has no effect on the estimation.').optional().meta({ found_in: 'body' }),
  overall_cardinality: z.record(Field, long).describe('Estimates of the cardinality that is observed for fields over the whole time period that the job analyzes data. To produce a good answer, values must be provided for fields referenced in the `by_field_name`, `over_field_name` and `partition_field_name` of any detectors. Providing values for other fields has no effect on the estimation. It can be omitted from the request if no detectors have a `by_field_name`, `over_field_name` or `partition_field_name`.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlEstimateModelMemoryRequest' })
export type MlEstimateModelMemoryRequest = z.infer<typeof MlEstimateModelMemoryRequest>

export const MlEstimateModelMemoryResponse = z.object({
  model_memory_estimate: z.string()
}).meta({ id: 'MlEstimateModelMemoryResponse' })
export type MlEstimateModelMemoryResponse = z.infer<typeof MlEstimateModelMemoryResponse>

export const MlEvaluateDataFrameConfusionMatrixPrediction = z.object({
  predicted_class: Name,
  count: integer
}).meta({ id: 'MlEvaluateDataFrameConfusionMatrixPrediction' })
export type MlEvaluateDataFrameConfusionMatrixPrediction = z.infer<typeof MlEvaluateDataFrameConfusionMatrixPrediction>

export const MlEvaluateDataFrameConfusionMatrixItem = z.object({
  actual_class: Name,
  actual_class_doc_count: integer,
  predicted_classes: z.array(MlEvaluateDataFrameConfusionMatrixPrediction),
  other_predicted_class_doc_count: integer
}).meta({ id: 'MlEvaluateDataFrameConfusionMatrixItem' })
export type MlEvaluateDataFrameConfusionMatrixItem = z.infer<typeof MlEvaluateDataFrameConfusionMatrixItem>

export const MlEvaluateDataFrameConfusionMatrixThreshold = z.object({
  true_positive: integer.describe('True Positive'),
  false_positive: integer.describe('False Positive'),
  true_negative: integer.describe('True Negative'),
  false_negative: integer.describe('False Negative')
}).meta({ id: 'MlEvaluateDataFrameConfusionMatrixThreshold' })
export type MlEvaluateDataFrameConfusionMatrixThreshold = z.infer<typeof MlEvaluateDataFrameConfusionMatrixThreshold>

export const MlEvaluateDataFrameDataframeEvaluationValue = z.object({
  value: double
}).meta({ id: 'MlEvaluateDataFrameDataframeEvaluationValue' })
export type MlEvaluateDataFrameDataframeEvaluationValue = z.infer<typeof MlEvaluateDataFrameDataframeEvaluationValue>

export const MlEvaluateDataFrameDataframeEvaluationSummaryAucRocCurveItem = z.object({
  tpr: double,
  fpr: double,
  threshold: double
}).meta({ id: 'MlEvaluateDataFrameDataframeEvaluationSummaryAucRocCurveItem' })
export type MlEvaluateDataFrameDataframeEvaluationSummaryAucRocCurveItem = z.infer<typeof MlEvaluateDataFrameDataframeEvaluationSummaryAucRocCurveItem>

export const MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc = z.object({
  ...MlEvaluateDataFrameDataframeEvaluationValue.shape,
  curve: z.array(MlEvaluateDataFrameDataframeEvaluationSummaryAucRocCurveItem).optional()
}).meta({ id: 'MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc' })
export type MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc = z.infer<typeof MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc>

export const MlEvaluateDataFrameDataframeEvaluationClass = z.object({
  ...MlEvaluateDataFrameDataframeEvaluationValue.shape,
  class_name: Name
}).meta({ id: 'MlEvaluateDataFrameDataframeEvaluationClass' })
export type MlEvaluateDataFrameDataframeEvaluationClass = z.infer<typeof MlEvaluateDataFrameDataframeEvaluationClass>

export const MlEvaluateDataFrameDataframeClassificationSummaryAccuracy = z.object({
  classes: z.array(MlEvaluateDataFrameDataframeEvaluationClass),
  overall_accuracy: double
}).meta({ id: 'MlEvaluateDataFrameDataframeClassificationSummaryAccuracy' })
export type MlEvaluateDataFrameDataframeClassificationSummaryAccuracy = z.infer<typeof MlEvaluateDataFrameDataframeClassificationSummaryAccuracy>

export const MlEvaluateDataFrameDataframeClassificationSummaryMulticlassConfusionMatrix = z.object({
  confusion_matrix: z.array(MlEvaluateDataFrameConfusionMatrixItem),
  other_actual_class_count: integer
}).meta({ id: 'MlEvaluateDataFrameDataframeClassificationSummaryMulticlassConfusionMatrix' })
export type MlEvaluateDataFrameDataframeClassificationSummaryMulticlassConfusionMatrix = z.infer<typeof MlEvaluateDataFrameDataframeClassificationSummaryMulticlassConfusionMatrix>

export const MlEvaluateDataFrameDataframeClassificationSummaryPrecision = z.object({
  classes: z.array(MlEvaluateDataFrameDataframeEvaluationClass),
  avg_precision: double
}).meta({ id: 'MlEvaluateDataFrameDataframeClassificationSummaryPrecision' })
export type MlEvaluateDataFrameDataframeClassificationSummaryPrecision = z.infer<typeof MlEvaluateDataFrameDataframeClassificationSummaryPrecision>

export const MlEvaluateDataFrameDataframeClassificationSummaryRecall = z.object({
  classes: z.array(MlEvaluateDataFrameDataframeEvaluationClass),
  avg_recall: double
}).meta({ id: 'MlEvaluateDataFrameDataframeClassificationSummaryRecall' })
export type MlEvaluateDataFrameDataframeClassificationSummaryRecall = z.infer<typeof MlEvaluateDataFrameDataframeClassificationSummaryRecall>

export const MlEvaluateDataFrameDataframeClassificationSummary = z.object({
  auc_roc: MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc.describe('The AUC ROC (area under the curve of the receiver operating characteristic) score and optionally the curve. It is calculated for a specific class (provided as "class_name") treated as positive.').optional(),
  accuracy: MlEvaluateDataFrameDataframeClassificationSummaryAccuracy.describe('Accuracy of predictions (per-class and overall).').optional(),
  multiclass_confusion_matrix: MlEvaluateDataFrameDataframeClassificationSummaryMulticlassConfusionMatrix.describe('Multiclass confusion matrix.').optional(),
  precision: MlEvaluateDataFrameDataframeClassificationSummaryPrecision.describe('Precision of predictions (per-class and average).').optional(),
  recall: MlEvaluateDataFrameDataframeClassificationSummaryRecall.describe('Recall of predictions (per-class and average).').optional()
}).meta({ id: 'MlEvaluateDataFrameDataframeClassificationSummary' })
export type MlEvaluateDataFrameDataframeClassificationSummary = z.infer<typeof MlEvaluateDataFrameDataframeClassificationSummary>

export const MlEvaluateDataFrameDataframeOutlierDetectionSummary = z.object({
  auc_roc: MlEvaluateDataFrameDataframeEvaluationSummaryAucRoc.describe('The AUC ROC (area under the curve of the receiver operating characteristic) score and optionally the curve.').optional(),
  precision: z.record(z.string(), double).describe('Set the different thresholds of the outlier score at where the metric is calculated.').optional(),
  recall: z.record(z.string(), double).describe('Set the different thresholds of the outlier score at where the metric is calculated.').optional(),
  confusion_matrix: z.record(z.string(), MlEvaluateDataFrameConfusionMatrixThreshold).describe('Set the different thresholds of the outlier score at where the metrics (`tp` - true positive, `fp` - false positive, `tn` - true negative, `fn` - false negative) are calculated.').optional()
}).meta({ id: 'MlEvaluateDataFrameDataframeOutlierDetectionSummary' })
export type MlEvaluateDataFrameDataframeOutlierDetectionSummary = z.infer<typeof MlEvaluateDataFrameDataframeOutlierDetectionSummary>

export const MlEvaluateDataFrameDataframeRegressionSummary = z.object({
  huber: MlEvaluateDataFrameDataframeEvaluationValue.describe('Pseudo Huber loss function.').optional(),
  mse: MlEvaluateDataFrameDataframeEvaluationValue.describe('Average squared difference between the predicted values and the actual (`ground truth`) value.').optional(),
  msle: MlEvaluateDataFrameDataframeEvaluationValue.describe('Average squared difference between the logarithm of the predicted values and the logarithm of the actual (`ground truth`) value.').optional(),
  r_squared: MlEvaluateDataFrameDataframeEvaluationValue.describe('Proportion of the variance in the dependent variable that is predictable from the independent variables.').optional()
}).meta({ id: 'MlEvaluateDataFrameDataframeRegressionSummary' })
export type MlEvaluateDataFrameDataframeRegressionSummary = z.infer<typeof MlEvaluateDataFrameDataframeRegressionSummary>

/**
 * Evaluate data frame analytics.
 *
 * The API packages together commonly used evaluation metrics for various types
 * of machine learning features. This has been designed for use on indexes
 * created by data frame analytics. Evaluation requires both a ground truth
 * field and an analytics result field to be present.
 */
export const MlEvaluateDataFrameRequest = z.object({
  ...RequestBase.shape,
  evaluation: MlDataframeEvaluationContainer.describe('Defines the type of evaluation you want to perform.').meta({ found_in: 'body' }),
  index: IndexName.describe('Defines the `index` in which the evaluation will be performed.').meta({ found_in: 'body' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('A query clause that retrieves a subset of data from the source index.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlEvaluateDataFrameRequest' })
export type MlEvaluateDataFrameRequest = z.infer<typeof MlEvaluateDataFrameRequest>

export const MlEvaluateDataFrameResponse = z.object({
  classification: MlEvaluateDataFrameDataframeClassificationSummary.describe('Evaluation results for a classification analysis. It outputs a prediction that identifies to which of the classes each document belongs.').optional(),
  outlier_detection: MlEvaluateDataFrameDataframeOutlierDetectionSummary.describe('Evaluation results for an outlier detection analysis. It outputs the probability that each document is an outlier.').optional(),
  regression: MlEvaluateDataFrameDataframeRegressionSummary.describe('Evaluation results for a regression analysis which outputs a prediction of values.').optional()
}).meta({ id: 'MlEvaluateDataFrameResponse' })
export type MlEvaluateDataFrameResponse = z.infer<typeof MlEvaluateDataFrameResponse>

/**
 * Explain data frame analytics config.
 *
 * This API provides explanations for a data frame analytics config that either
 * exists already or one that has not been created yet. The following
 * explanations are provided:
 * * which fields are included or not in the analysis and why,
 * * how much memory is estimated to be required. The estimate can be used when deciding the appropriate value for model_memory_limit setting later on.
 * If you have object fields or fields that are excluded via source filtering, they are not included in the explanation.
 */
export const MlExplainDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').optional().meta({ found_in: 'path' }),
  source: MlDataframeAnalyticsSource.describe('The configuration of how to source the analysis data. It requires an index. Optionally, query and _source may be specified.').optional().meta({ found_in: 'body' }),
  dest: MlDataframeAnalyticsDestination.describe('The destination configuration, consisting of index and optionally results_field (ml by default).').optional().meta({ found_in: 'body' }),
  analysis: MlDataframeAnalysisContainer.describe('The analysis configuration, which contains the information necessary to perform one of the following types of analysis: classification, outlier detection, or regression.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('A description of the job.').optional().meta({ found_in: 'body' }),
  model_memory_limit: z.string().describe('The approximate maximum amount of memory resources that are permitted for analytical processing. If your `elasticsearch.yml` file contains an `xpack.ml.max_model_memory_limit` setting, an error occurs when you try to create data frame analytics jobs that have `model_memory_limit` values greater than that setting.').optional().meta({ found_in: 'body' }),
  max_num_threads: integer.describe('The maximum number of threads to be used by the analysis. Using more threads may decrease the time necessary to complete the analysis at the cost of using more CPU. Note that the process may use additional threads for operational functionality other than the analysis itself.').optional().meta({ found_in: 'body' }),
  analyzed_fields: MlDataframeAnalysisAnalyzedFields.describe('Specify includes and/or excludes patterns to select which fields will be included in the analysis. The patterns specified in excludes are applied last, therefore excludes takes precedence. In other words, if the same field is specified in both includes and excludes, then the field will not be included in the analysis.').optional().meta({ found_in: 'body' }),
  allow_lazy_start: z.boolean().describe('Specifies whether this job can start when there is insufficient machine learning node capacity for it to be immediately assigned to a node.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlExplainDataFrameAnalyticsRequest' })
export type MlExplainDataFrameAnalyticsRequest = z.infer<typeof MlExplainDataFrameAnalyticsRequest>

export const MlExplainDataFrameAnalyticsResponse = z.object({
  field_selection: z.array(MlDataframeAnalyticsFieldSelection).describe('An array of objects that explain selection for each field, sorted by the field names.'),
  memory_estimation: MlDataframeAnalyticsMemoryEstimation.describe('An array of objects that explain selection for each field, sorted by the field names.')
}).meta({ id: 'MlExplainDataFrameAnalyticsResponse' })
export type MlExplainDataFrameAnalyticsResponse = z.infer<typeof MlExplainDataFrameAnalyticsResponse>

/**
 * Force buffered data to be processed.
 *
 * The flush jobs API is only applicable when sending data for analysis using
 * the post data API. Depending on the content of the buffer, then it might
 * additionally calculate new results. Both flush and close operations are
 * similar, however the flush is more efficient if you are expecting to send
 * more data for analysis. When flushing, the job remains open and is available
 * to continue analyzing data. A close operation additionally prunes and
 * persists the model state to disk and the job must be opened again before
 * analyzing further data.
 * @deprecated Forcing any buffered data to be processed is deprecated, in a future major version a datafeed will be required.
 */
export const MlFlushJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  advance_time: DateTime.describe('Refer to the description for the `advance_time` query parameter.').optional().meta({ found_in: 'body' }),
  calc_interim: z.boolean().describe('Refer to the description for the `calc_interim` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  skip_time: DateTime.describe('Refer to the description for the `skip_time` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlFlushJobRequest' })
export type MlFlushJobRequest = z.infer<typeof MlFlushJobRequest>

export const MlFlushJobResponse = z.object({
  flushed: z.boolean(),
  last_finalized_bucket_end: integer.describe('Provides the timestamp (in milliseconds since the epoch) of the end of the last bucket that was processed.').optional()
}).meta({ id: 'MlFlushJobResponse' })
export type MlFlushJobResponse = z.infer<typeof MlFlushJobResponse>

/**
 * Predict future behavior of a time series.
 *
 * Forecasts are not supported for jobs that perform population analysis; an
 * error occurs if you try to create a forecast for a job that has an
 * `over_field_name` in its configuration. Forcasts predict future behavior
 * based on historical data.
 */
export const MlForecastRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. The job must be open when you create a forecast; otherwise, an error occurs.').meta({ found_in: 'path' }),
  duration: Duration.describe('Refer to the description for the `duration` query parameter.').optional().meta({ found_in: 'body' }),
  expires_in: Duration.describe('Refer to the description for the `expires_in` query parameter.').optional().meta({ found_in: 'body' }),
  max_model_memory: z.string().describe('Refer to the description for the `max_model_memory` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlForecastRequest' })
export type MlForecastRequest = z.infer<typeof MlForecastRequest>

export const MlForecastResponse = z.object({
  acknowledged: z.boolean(),
  forecast_id: Id
}).meta({ id: 'MlForecastResponse' })
export type MlForecastResponse = z.infer<typeof MlForecastResponse>

/**
 * Get anomaly detection job results for buckets.
 *
 * The API presents a chronological view of the records, grouped by bucket.
 */
export const MlGetBucketsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  timestamp: DateTime.describe('The timestamp of a single bucket result. If you do not specify this parameter, the API returns information about all buckets.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of buckets.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of buckets to obtain.').optional().meta({ found_in: 'query' }),
  anomaly_score: double.describe('Refer to the description for the `anomaly_score` query parameter.').optional().meta({ found_in: 'body' }),
  desc: z.boolean().describe('Refer to the description for the `desc` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  exclude_interim: z.boolean().describe('Refer to the description for the `exclude_interim` query parameter.').optional().meta({ found_in: 'body' }),
  expand: z.boolean().describe('Refer to the description for the `expand` query parameter.').optional().meta({ found_in: 'body' }),
  page: MlPage.optional().meta({ found_in: 'body' }),
  sort: Field.describe('Refer to the desription for the `sort` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetBucketsRequest' })
export type MlGetBucketsRequest = z.infer<typeof MlGetBucketsRequest>

export const MlGetBucketsResponse = z.object({
  buckets: z.array(MlBucketSummary),
  count: long
}).meta({ id: 'MlGetBucketsResponse' })
export type MlGetBucketsResponse = z.infer<typeof MlGetBucketsResponse>

/** Get info about events in calendars. */
export const MlGetCalendarEventsRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar. You can get information for multiple calendars by using a comma-separated list of ids or a wildcard expression. You can get information for all calendars by using `_all` or `*` or by omitting the calendar identifier.').meta({ found_in: 'path' }),
  end: DateTime.describe('Specifies to get events with timestamps earlier than this time.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of events.').optional().meta({ found_in: 'query' }),
  job_id: Id.describe('Specifies to get events for a specific anomaly detection job identifier or job group. It must be used with a calendar identifier of `_all` or `*`.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of events to obtain.').optional().meta({ found_in: 'query' }),
  start: DateTime.describe('Specifies to get events with timestamps after this time.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetCalendarEventsRequest' })
export type MlGetCalendarEventsRequest = z.infer<typeof MlGetCalendarEventsRequest>

export const MlGetCalendarEventsResponse = z.object({
  count: long,
  events: z.array(MlCalendarEvent)
}).meta({ id: 'MlGetCalendarEventsResponse' })
export type MlGetCalendarEventsResponse = z.infer<typeof MlGetCalendarEventsResponse>

export const MlGetCalendarsCalendar = z.object({
  calendar_id: Id.describe('A string that uniquely identifies a calendar.'),
  description: z.string().describe('A description of the calendar.').optional(),
  job_ids: z.array(Id).describe('An array of anomaly detection job identifiers.')
}).meta({ id: 'MlGetCalendarsCalendar' })
export type MlGetCalendarsCalendar = z.infer<typeof MlGetCalendarsCalendar>

/** Get calendar configuration info. */
export const MlGetCalendarsRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar. You can get information for multiple calendars by using a comma-separated list of ids or a wildcard expression. You can get information for all calendars by using `_all` or `*` or by omitting the calendar identifier.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of calendars. This parameter is supported only when you omit the calendar identifier.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of calendars to obtain. This parameter is supported only when you omit the calendar identifier.').optional().meta({ found_in: 'query' }),
  page: MlPage.describe('This object is supported only when you omit the calendar identifier.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetCalendarsRequest' })
export type MlGetCalendarsRequest = z.infer<typeof MlGetCalendarsRequest>

export const MlGetCalendarsResponse = z.object({
  calendars: z.array(MlGetCalendarsCalendar),
  count: long
}).meta({ id: 'MlGetCalendarsResponse' })
export type MlGetCalendarsResponse = z.infer<typeof MlGetCalendarsResponse>

/** Get anomaly detection job results for categories. */
export const MlGetCategoriesRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  category_id: CategoryId.describe('Identifier for the category, which is unique in the job. If you specify neither the category ID nor the partition_field_value, the API returns information about all categories. If you specify only the partition_field_value, it returns information about all categories for the specified partition.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of categories.').optional().meta({ found_in: 'query' }),
  partition_field_value: z.string().describe('Only return categories for the specified partition.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of categories to obtain.').optional().meta({ found_in: 'query' }),
  page: MlPage.describe('Configures pagination. This parameter has the `from` and `size` properties.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetCategoriesRequest' })
export type MlGetCategoriesRequest = z.infer<typeof MlGetCategoriesRequest>

export const MlGetCategoriesResponse = z.object({
  categories: z.array(MlCategory),
  count: long
}).meta({ id: 'MlGetCategoriesResponse' })
export type MlGetCategoriesResponse = z.infer<typeof MlGetCategoriesResponse>

/**
 * Get data frame analytics job configuration info.
 *
 * You can get information for multiple data frame analytics jobs in a single
 * API request by using a comma-separated list of data frame analytics jobs or a
 * wildcard expression.
 */
export const MlGetDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. If you do not specify this option, the API returns information for the first hundred data frame analytics jobs.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no data frame analytics jobs that match. 2. Contains the `_all` string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. The default value returns an empty data_frame_analytics array when there are no matches and the subset of results when there are partial matches. If this parameter is `false`, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of data frame analytics jobs.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of data frame analytics jobs to obtain.').optional().meta({ found_in: 'query' }),
  exclude_generated: z.boolean().describe('Indicates if certain fields should be removed from the configuration on retrieval. This allows the configuration to be in an acceptable format to be retrieved and then added to another cluster.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetDataFrameAnalyticsRequest' })
export type MlGetDataFrameAnalyticsRequest = z.infer<typeof MlGetDataFrameAnalyticsRequest>

export const MlGetDataFrameAnalyticsResponse = z.object({
  count: integer,
  data_frame_analytics: z.array(MlDataframeAnalyticsSummary).describe('An array of data frame analytics job resources, which are sorted by the id value in ascending order.')
}).meta({ id: 'MlGetDataFrameAnalyticsResponse' })
export type MlGetDataFrameAnalyticsResponse = z.infer<typeof MlGetDataFrameAnalyticsResponse>

/** Get data frame analytics job stats. */
export const MlGetDataFrameAnalyticsStatsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. If you do not specify this option, the API returns information for the first hundred data frame analytics jobs.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no data frame analytics jobs that match. 2. Contains the `_all` string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. The default value returns an empty data_frame_analytics array when there are no matches and the subset of results when there are partial matches. If this parameter is `false`, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of data frame analytics jobs.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of data frame analytics jobs to obtain.').optional().meta({ found_in: 'query' }),
  verbose: z.boolean().describe('Defines whether the stats response should be verbose.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetDataFrameAnalyticsStatsRequest' })
export type MlGetDataFrameAnalyticsStatsRequest = z.infer<typeof MlGetDataFrameAnalyticsStatsRequest>

export const MlGetDataFrameAnalyticsStatsResponse = z.object({
  count: long,
  data_frame_analytics: z.array(MlDataframeAnalytics).describe('An array of objects that contain usage information for data frame analytics jobs, which are sorted by the id value in ascending order.')
}).meta({ id: 'MlGetDataFrameAnalyticsStatsResponse' })
export type MlGetDataFrameAnalyticsStatsResponse = z.infer<typeof MlGetDataFrameAnalyticsStatsResponse>

/**
 * Get datafeed stats.
 *
 * You can get statistics for multiple datafeeds in a single API request by
 * using a comma-separated list of datafeeds or a wildcard expression. You can
 * get statistics for all datafeeds by using `_all`, by specifying `*` as the
 * `<feed_id>`, or by omitting the `<feed_id>`. If the datafeed is stopped, the
 * only information you receive is the `datafeed_id` and the `state`.
 * This API returns a maximum of 10,000 datafeeds.
 */
export const MlGetDatafeedStatsRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Ids.describe('Identifier for the datafeed. It can be a datafeed identifier or a wildcard expression. If you do not specify one of these options, the API returns information about all datafeeds.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no datafeeds that match. 2. Contains the `_all` string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. The default value is `true`, which returns an empty `datafeeds` array when there are no matches and the subset of results when there are partial matches. If this parameter is `false`, the request returns a `404` status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetDatafeedStatsRequest' })
export type MlGetDatafeedStatsRequest = z.infer<typeof MlGetDatafeedStatsRequest>

export const MlGetDatafeedStatsResponse = z.object({
  count: long,
  datafeeds: z.array(MlDatafeedStats)
}).meta({ id: 'MlGetDatafeedStatsResponse' })
export type MlGetDatafeedStatsResponse = z.infer<typeof MlGetDatafeedStatsResponse>

/**
 * Get datafeeds configuration info.
 *
 * You can get information for multiple datafeeds in a single API request by
 * using a comma-separated list of datafeeds or a wildcard expression. You can
 * get information for all datafeeds by using `_all`, by specifying `*` as the
 * `<feed_id>`, or by omitting the `<feed_id>`.
 * This API returns a maximum of 10,000 datafeeds.
 */
export const MlGetDatafeedsRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Ids.describe('Identifier for the datafeed. It can be a datafeed identifier or a wildcard expression. If you do not specify one of these options, the API returns information about all datafeeds.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no datafeeds that match. 2. Contains the `_all` string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. The default value is `true`, which returns an empty `datafeeds` array when there are no matches and the subset of results when there are partial matches. If this parameter is `false`, the request returns a `404` status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  exclude_generated: z.boolean().describe('Indicates if certain fields should be removed from the configuration on retrieval. This allows the configuration to be in an acceptable format to be retrieved and then added to another cluster.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetDatafeedsRequest' })
export type MlGetDatafeedsRequest = z.infer<typeof MlGetDatafeedsRequest>

export const MlGetDatafeedsResponse = z.object({
  count: long,
  datafeeds: z.array(MlDatafeed)
}).meta({ id: 'MlGetDatafeedsResponse' })
export type MlGetDatafeedsResponse = z.infer<typeof MlGetDatafeedsResponse>

/**
 * Get filters.
 *
 * You can get a single filter or all filters.
 */
export const MlGetFiltersRequest = z.object({
  ...RequestBase.shape,
  filter_id: Ids.describe('A string that uniquely identifies a filter.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of filters.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of filters to obtain.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetFiltersRequest' })
export type MlGetFiltersRequest = z.infer<typeof MlGetFiltersRequest>

export const MlGetFiltersResponse = z.object({
  count: long,
  filters: z.array(MlFilter)
}).meta({ id: 'MlGetFiltersResponse' })
export type MlGetFiltersResponse = z.infer<typeof MlGetFiltersResponse>

/**
 * Get anomaly detection job results for influencers.
 *
 * Influencers are the entities that have contributed to, or are to blame for,
 * the anomalies. Influencer results are available only if an
 * `influencer_field_name` is specified in the job configuration.
 */
export const MlGetInfluencersRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  desc: z.boolean().describe('If true, the results are sorted in descending order.').optional().meta({ found_in: 'query' }),
  end: DateTime.describe('Returns influencers with timestamps earlier than this time. The default value means it is unset and results are not limited to specific timestamps.').optional().meta({ found_in: 'query' }),
  exclude_interim: z.boolean().describe('If true, the output excludes interim results. By default, interim results are included.').optional().meta({ found_in: 'query' }),
  influencer_score: double.describe('Returns influencers with anomaly scores greater than or equal to this value.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of influencers.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of influencers to obtain.').optional().meta({ found_in: 'query' }),
  sort: Field.describe('Specifies the sort field for the requested influencers. By default, the influencers are sorted by the `influencer_score` value.').optional().meta({ found_in: 'query' }),
  start: DateTime.describe('Returns influencers with timestamps after this time. The default value means it is unset and results are not limited to specific timestamps.').optional().meta({ found_in: 'query' }),
  page: MlPage.describe('Configures pagination. This parameter has the `from` and `size` properties.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetInfluencersRequest' })
export type MlGetInfluencersRequest = z.infer<typeof MlGetInfluencersRequest>

export const MlGetInfluencersResponse = z.object({
  count: long,
  influencers: z.array(MlInfluencer).describe('Array of influencer objects')
}).meta({ id: 'MlGetInfluencersResponse' })
export type MlGetInfluencersResponse = z.infer<typeof MlGetInfluencersResponse>

/** Get anomaly detection job stats. */
export const MlGetJobStatsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. It can be a job identifier, a group name, a comma-separated list of jobs, or a wildcard expression. If you do not specify one of these options, the API returns information for all anomaly detection jobs.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no jobs that match. 2. Contains the _all string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. If `true`, the API returns an empty `jobs` array when there are no matches and the subset of results when there are partial matches. If `false`, the API returns a `404` status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetJobStatsRequest' })
export type MlGetJobStatsRequest = z.infer<typeof MlGetJobStatsRequest>

export const MlGetJobStatsResponse = z.object({
  count: long,
  jobs: z.array(MlJobStats)
}).meta({ id: 'MlGetJobStatsResponse' })
export type MlGetJobStatsResponse = z.infer<typeof MlGetJobStatsResponse>

/**
 * Get anomaly detection jobs configuration info.
 *
 * You can get information for multiple anomaly detection jobs in a single API
 * request by using a group name, a comma-separated list of jobs, or a wildcard
 * expression. You can get information for all anomaly detection jobs by using
 * `_all`, by specifying `*` as the `<job_id>`, or by omitting the `<job_id>`.
 */
export const MlGetJobsRequest = z.object({
  ...RequestBase.shape,
  job_id: Ids.describe('Identifier for the anomaly detection job. It can be a job identifier, a group name, or a wildcard expression. If you do not specify one of these options, the API returns information for all anomaly detection jobs.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no jobs that match. 2. Contains the _all string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. The default value is `true`, which returns an empty `jobs` array when there are no matches and the subset of results when there are partial matches. If this parameter is `false`, the request returns a `404` status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' }),
  exclude_generated: z.boolean().describe('Indicates if certain fields should be removed from the configuration on retrieval. This allows the configuration to be in an acceptable format to be retrieved and then added to another cluster.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetJobsRequest' })
export type MlGetJobsRequest = z.infer<typeof MlGetJobsRequest>

export const MlGetJobsResponse = z.object({
  count: long,
  jobs: z.array(MlJob)
}).meta({ id: 'MlGetJobsResponse' })
export type MlGetJobsResponse = z.infer<typeof MlGetJobsResponse>

export const MlGetMemoryStatsJvmStats = z.object({
  heap_max: ByteSize.describe('Maximum amount of memory available for use by the heap.').optional(),
  heap_max_in_bytes: integer.describe('Maximum amount of memory, in bytes, available for use by the heap.'),
  java_inference: ByteSize.describe('Amount of Java heap currently being used for caching inference models.').optional(),
  java_inference_in_bytes: integer.describe('Amount of Java heap, in bytes, currently being used for caching inference models.'),
  java_inference_max: ByteSize.describe('Maximum amount of Java heap to be used for caching inference models.').optional(),
  java_inference_max_in_bytes: integer.describe('Maximum amount of Java heap, in bytes, to be used for caching inference models.')
}).meta({ id: 'MlGetMemoryStatsJvmStats' })
export type MlGetMemoryStatsJvmStats = z.infer<typeof MlGetMemoryStatsJvmStats>

export const MlGetMemoryStatsMemMlStats = z.object({
  anomaly_detectors: ByteSize.describe('Amount of native memory set aside for anomaly detection jobs.').optional(),
  anomaly_detectors_in_bytes: integer.describe('Amount of native memory, in bytes, set aside for anomaly detection jobs.'),
  data_frame_analytics: ByteSize.describe('Amount of native memory set aside for data frame analytics jobs.').optional(),
  data_frame_analytics_in_bytes: integer.describe('Amount of native memory, in bytes, set aside for data frame analytics jobs.'),
  max: ByteSize.describe('Maximum amount of native memory (separate to the JVM heap) that may be used by machine learning native processes.').optional(),
  max_in_bytes: integer.describe('Maximum amount of native memory (separate to the JVM heap), in bytes, that may be used by machine learning native processes.'),
  native_code_overhead: ByteSize.describe('Amount of native memory set aside for loading machine learning native code shared libraries.').optional(),
  native_code_overhead_in_bytes: integer.describe('Amount of native memory, in bytes, set aside for loading machine learning native code shared libraries.'),
  native_inference: ByteSize.describe('Amount of native memory set aside for trained models that have a PyTorch model_type.').optional(),
  native_inference_in_bytes: integer.describe('Amount of native memory, in bytes, set aside for trained models that have a PyTorch model_type.')
}).meta({ id: 'MlGetMemoryStatsMemMlStats' })
export type MlGetMemoryStatsMemMlStats = z.infer<typeof MlGetMemoryStatsMemMlStats>

export const MlGetMemoryStatsMemStats = z.object({
  adjusted_total: ByteSize.describe('If the amount of physical memory has been overridden using the es.total_memory_bytes system property then this reports the overridden value. Otherwise it reports the same value as total.').optional(),
  adjusted_total_in_bytes: integer.describe('If the amount of physical memory has been overridden using the `es.total_memory_bytes` system property then this reports the overridden value in bytes. Otherwise it reports the same value as `total_in_bytes`.'),
  total: ByteSize.describe('Total amount of physical memory.').optional(),
  total_in_bytes: integer.describe('Total amount of physical memory in bytes.'),
  ml: MlGetMemoryStatsMemMlStats.describe('Contains statistics about machine learning use of native memory on the node.')
}).meta({ id: 'MlGetMemoryStatsMemStats' })
export type MlGetMemoryStatsMemStats = z.infer<typeof MlGetMemoryStatsMemStats>

export const MlGetMemoryStatsMemory = z.object({
  attributes: z.record(z.string(), z.string()),
  jvm: MlGetMemoryStatsJvmStats.describe('Contains Java Virtual Machine (JVM) statistics for the node.'),
  mem: MlGetMemoryStatsMemStats.describe('Contains statistics about memory usage for the node.'),
  name: Name.describe('Human-readable identifier for the node. Based on the Node name setting setting.'),
  roles: z.array(z.string()).describe('Roles assigned to the node.'),
  transport_address: TransportAddress.describe('The host and port where transport HTTP connections are accepted.'),
  ephemeral_id: Id
}).meta({ id: 'MlGetMemoryStatsMemory' })
export type MlGetMemoryStatsMemory = z.infer<typeof MlGetMemoryStatsMemory>

/**
 * Get machine learning memory usage info.
 *
 * Get information about how machine learning jobs and trained models are using memory,
 * on each node, both within the JVM heap, and natively, outside of the JVM.
 */
export const MlGetMemoryStatsRequest = z.object({
  ...RequestBase.shape,
  node_id: Id.describe('The names of particular nodes in the cluster to target. For example, `nodeId1,nodeId2` or `ml:true`').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetMemoryStatsRequest' })
export type MlGetMemoryStatsRequest = z.infer<typeof MlGetMemoryStatsRequest>

export const MlGetMemoryStatsResponse = z.object({
  _nodes: NodeStatistics,
  cluster_name: Name,
  nodes: z.record(Id, MlGetMemoryStatsMemory)
}).meta({ id: 'MlGetMemoryStatsResponse' })
export type MlGetMemoryStatsResponse = z.infer<typeof MlGetMemoryStatsResponse>

/** Get anomaly detection job model snapshot upgrade usage info. */
export const MlGetModelSnapshotUpgradeStatsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('A numerical character string that uniquely identifies the model snapshot. You can get information for multiple snapshots by using a comma-separated list or a wildcard expression. You can get all snapshots by using `_all`, by specifying `*` as the snapshot ID, or by omitting the snapshot ID.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request:  -  Contains wildcard expressions and there are no jobs that match.  -  Contains the _all string or no identifiers and there are no matches.  -  Contains wildcard expressions and there are only partial matches. The default value is true, which returns an empty jobs array when there are no matches and the subset of results when there are partial matches. If this parameter is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetModelSnapshotUpgradeStatsRequest' })
export type MlGetModelSnapshotUpgradeStatsRequest = z.infer<typeof MlGetModelSnapshotUpgradeStatsRequest>

export const MlGetModelSnapshotUpgradeStatsResponse = z.object({
  count: long,
  model_snapshot_upgrades: z.array(MlModelSnapshotUpgrade)
}).meta({ id: 'MlGetModelSnapshotUpgradeStatsResponse' })
export type MlGetModelSnapshotUpgradeStatsResponse = z.infer<typeof MlGetModelSnapshotUpgradeStatsResponse>

/** Get model snapshots info. */
export const MlGetModelSnapshotsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('A numerical character string that uniquely identifies the model snapshot. You can get information for multiple snapshots by using a comma-separated list or a wildcard expression. You can get all snapshots by using `_all`, by specifying `*` as the snapshot ID, or by omitting the snapshot ID.').optional().meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of snapshots.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of snapshots to obtain.').optional().meta({ found_in: 'query' }),
  desc: z.boolean().describe('Refer to the description for the `desc` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  page: MlPage.optional().meta({ found_in: 'body' }),
  sort: Field.describe('Refer to the description for the `sort` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetModelSnapshotsRequest' })
export type MlGetModelSnapshotsRequest = z.infer<typeof MlGetModelSnapshotsRequest>

export const MlGetModelSnapshotsResponse = z.object({
  count: long,
  model_snapshots: z.array(MlModelSnapshot)
}).meta({ id: 'MlGetModelSnapshotsResponse' })
export type MlGetModelSnapshotsResponse = z.infer<typeof MlGetModelSnapshotsResponse>

/**
 * Get overall bucket results.
 *
 * Retrievs overall bucket results that summarize the bucket results of
 * multiple anomaly detection jobs.
 *
 * The `overall_score` is calculated by combining the scores of all the
 * buckets within the overall bucket span. First, the maximum
 * `anomaly_score` per anomaly detection job in the overall bucket is
 * calculated. Then the `top_n` of those scores are averaged to result in
 * the `overall_score`. This means that you can fine-tune the
 * `overall_score` so that it is more or less sensitive to the number of
 * jobs that detect an anomaly at the same time. For example, if you set
 * `top_n` to `1`, the `overall_score` is the maximum bucket score in the
 * overall bucket. Alternatively, if you set `top_n` to the number of jobs,
 * the `overall_score` is high only when all jobs detect anomalies in that
 * overall bucket. If you set the `bucket_span` parameter (to a value
 * greater than its default), the `overall_score` is the maximum
 * `overall_score` of the overall buckets that have a span equal to the
 * jobs' largest bucket span.
 */
export const MlGetOverallBucketsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. It can be a job identifier, a group name, a comma-separated list of jobs or groups, or a wildcard expression. You can summarize the bucket results for all anomaly detection jobs by using `_all` or by specifying `*` as the `<job_id>`.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Refer to the description for the `allow_no_match` query parameter.').optional().meta({ found_in: 'body' }),
  bucket_span: Duration.describe('Refer to the description for the `bucket_span` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  exclude_interim: z.boolean().describe('Refer to the description for the `exclude_interim` query parameter.').optional().meta({ found_in: 'body' }),
  overall_score: double.describe('Refer to the description for the `overall_score` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' }),
  top_n: integer.describe('Refer to the description for the `top_n` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetOverallBucketsRequest' })
export type MlGetOverallBucketsRequest = z.infer<typeof MlGetOverallBucketsRequest>

export const MlGetOverallBucketsResponse = z.object({
  count: long,
  overall_buckets: z.array(MlOverallBucket).describe('Array of overall bucket objects')
}).meta({ id: 'MlGetOverallBucketsResponse' })
export type MlGetOverallBucketsResponse = z.infer<typeof MlGetOverallBucketsResponse>

/**
 * Get anomaly records for an anomaly detection job.
 *
 * Records contain the detailed analytical results. They describe the anomalous
 * activity that has been identified in the input data based on the detector
 * configuration.
 * There can be many anomaly records depending on the characteristics and size
 * of the input data. In practice, there are often too many to be able to
 * manually process them. The machine learning features therefore perform a
 * sophisticated aggregation of the anomaly records into buckets.
 * The number of record results depends on the number of anomalies found in each
 * bucket, which relates to the number of time series being modeled and the
 * number of detectors.
 */
export const MlGetRecordsRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  from: integer.describe('Skips the specified number of records.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of records to obtain.').optional().meta({ found_in: 'query' }),
  desc: z.boolean().describe('Refer to the description for the `desc` query parameter.').optional().meta({ found_in: 'body' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  exclude_interim: z.boolean().describe('Refer to the description for the `exclude_interim` query parameter.').optional().meta({ found_in: 'body' }),
  page: MlPage.optional().meta({ found_in: 'body' }),
  record_score: double.describe('Refer to the description for the `record_score` query parameter.').optional().meta({ found_in: 'body' }),
  sort: Field.describe('Refer to the description for the `sort` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlGetRecordsRequest' })
export type MlGetRecordsRequest = z.infer<typeof MlGetRecordsRequest>

export const MlGetRecordsResponse = z.object({
  count: long,
  records: z.array(MlAnomaly)
}).meta({ id: 'MlGetRecordsResponse' })
export type MlGetRecordsResponse = z.infer<typeof MlGetRecordsResponse>

/** Get trained model configuration info. */
export const MlGetTrainedModelsRequest = z.object({
  ...RequestBase.shape,
  model_id: Ids.describe('The unique identifier of the trained model or a model alias. You can get information for multiple trained models in a single API request by using a comma-separated list of model IDs or a wildcard expression.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: - Contains wildcard expressions and there are no models that match. - Contains the _all string or no identifiers and there are no matches. - Contains wildcard expressions and there are only partial matches. If true, it returns an empty array when there are no matches and the subset of results when there are partial matches.').optional().meta({ found_in: 'query' }),
  decompress_definition: z.boolean().describe('Specifies whether the included model definition should be returned as a JSON map (true) or in a custom compressed format (false).').optional().meta({ found_in: 'query' }),
  exclude_generated: z.boolean().describe('Indicates if certain fields should be removed from the configuration on retrieval. This allows the configuration to be in an acceptable format to be retrieved and then added to another cluster.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of models.').optional().meta({ found_in: 'query' }),
  include: MlInclude.describe('A comma delimited string of optional fields to include in the response body.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of models to obtain.').optional().meta({ found_in: 'query' }),
  tags: z.union([z.string(), z.array(z.string())]).describe('A comma delimited string of tags. A trained model can have many tags, or none. When supplied, only trained models that contain all the supplied tags are returned.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetTrainedModelsRequest' })
export type MlGetTrainedModelsRequest = z.infer<typeof MlGetTrainedModelsRequest>

export const MlGetTrainedModelsResponse = z.object({
  count: integer,
  trained_model_configs: z.array(MlTrainedModelConfig).describe('An array of trained model resources, which are sorted by the model_id value in ascending order.')
}).meta({ id: 'MlGetTrainedModelsResponse' })
export type MlGetTrainedModelsResponse = z.infer<typeof MlGetTrainedModelsResponse>

/**
 * Get trained models usage info.
 *
 * You can get usage information for multiple trained
 * models in a single API request by using a comma-separated list of model IDs or a wildcard expression.
 */
export const MlGetTrainedModelsStatsRequest = z.object({
  ...RequestBase.shape,
  model_id: Ids.describe('The unique identifier of the trained model or a model alias. It can be a comma-separated list or a wildcard expression.').optional().meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: - Contains wildcard expressions and there are no models that match. - Contains the _all string or no identifiers and there are no matches. - Contains wildcard expressions and there are only partial matches. If true, it returns an empty array when there are no matches and the subset of results when there are partial matches.').optional().meta({ found_in: 'query' }),
  from: integer.describe('Skips the specified number of models.').optional().meta({ found_in: 'query' }),
  size: integer.describe('Specifies the maximum number of models to obtain.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlGetTrainedModelsStatsRequest' })
export type MlGetTrainedModelsStatsRequest = z.infer<typeof MlGetTrainedModelsStatsRequest>

export const MlGetTrainedModelsStatsResponse = z.object({
  count: integer.describe('The total number of trained model statistics that matched the requested ID patterns. Could be higher than the number of items in the trained_model_stats array as the size of the array is restricted by the supplied size parameter.'),
  trained_model_stats: z.array(MlTrainedModelStats).describe('An array of trained model statistics, which are sorted by the model_id value in ascending order.')
}).meta({ id: 'MlGetTrainedModelsStatsResponse' })
export type MlGetTrainedModelsStatsResponse = z.infer<typeof MlGetTrainedModelsStatsResponse>

/** Evaluate a trained model. */
export const MlInferTrainedModelRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Controls the amount of time to wait for inference results.').optional().meta({ found_in: 'query' }),
  docs: z.array(z.record(z.string(), z.any())).describe('An array of objects to pass to the model for inference. The objects should contain a fields matching your configured trained model input. Typically, for NLP models, the field name is `text_field`. Currently, for NLP models, only a single value is allowed.').meta({ found_in: 'body' }),
  inference_config: MlInferenceConfigUpdateContainer.describe('The inference configuration updates to apply on the API call').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlInferTrainedModelRequest' })
export type MlInferTrainedModelRequest = z.infer<typeof MlInferTrainedModelRequest>

export const MlInferTrainedModelResponse = z.object({
  inference_results: z.array(MlInferenceResponseResult)
}).meta({ id: 'MlInferTrainedModelResponse' })
export type MlInferTrainedModelResponse = z.infer<typeof MlInferTrainedModelResponse>

export const MlInfoAnomalyDetectors = z.object({
  categorization_analyzer: MlCategorizationAnalyzer,
  categorization_examples_limit: integer,
  model_memory_limit: z.string(),
  model_snapshot_retention_days: integer,
  daily_model_snapshot_retention_after_days: integer
}).meta({ id: 'MlInfoAnomalyDetectors' })
export type MlInfoAnomalyDetectors = z.infer<typeof MlInfoAnomalyDetectors>

export const MlInfoDatafeeds = z.object({
  scroll_size: integer
}).meta({ id: 'MlInfoDatafeeds' })
export type MlInfoDatafeeds = z.infer<typeof MlInfoDatafeeds>

export const MlInfoDefaults = z.object({
  anomaly_detectors: MlInfoAnomalyDetectors,
  datafeeds: MlInfoDatafeeds
}).meta({ id: 'MlInfoDefaults' })
export type MlInfoDefaults = z.infer<typeof MlInfoDefaults>

export const MlInfoLimits = z.object({
  max_single_ml_node_processors: integer.optional(),
  total_ml_processors: integer.optional(),
  max_model_memory_limit: ByteSize.optional(),
  effective_max_model_memory_limit: ByteSize.optional(),
  total_ml_memory: ByteSize
}).meta({ id: 'MlInfoLimits' })
export type MlInfoLimits = z.infer<typeof MlInfoLimits>

export const MlInfoNativeCode = z.object({
  build_hash: z.string(),
  version: VersionString
}).meta({ id: 'MlInfoNativeCode' })
export type MlInfoNativeCode = z.infer<typeof MlInfoNativeCode>

/**
 * Get machine learning information.
 *
 * Get defaults and limits used by machine learning.
 * This endpoint is designed to be used by a user interface that needs to fully
 * understand machine learning configurations where some options are not
 * specified, meaning that the defaults should be used. This endpoint may be
 * used to find out what those defaults are. It also provides information about
 * the maximum size of machine learning jobs that could run in the current
 * cluster configuration.
 */
export const MlInfoRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'MlInfoRequest' })
export type MlInfoRequest = z.infer<typeof MlInfoRequest>

export const MlInfoResponse = z.object({
  defaults: MlInfoDefaults,
  limits: MlInfoLimits,
  upgrade_mode: z.boolean(),
  native_code: MlInfoNativeCode
}).meta({ id: 'MlInfoResponse' })
export type MlInfoResponse = z.infer<typeof MlInfoResponse>

/**
 * Open anomaly detection jobs.
 *
 * An anomaly detection job must be opened to be ready to receive and analyze
 * data. It can be opened and closed multiple times throughout its lifecycle.
 * When you open a new job, it starts with an empty model.
 * When you open an existing job, the most recent model state is automatically
 * loaded. The job is ready to resume its analysis from where it left off, once
 * new data is received.
 */
export const MlOpenJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Refer to the description for the `timeout` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlOpenJobRequest' })
export type MlOpenJobRequest = z.infer<typeof MlOpenJobRequest>

export const MlOpenJobResponse = z.object({
  opened: z.boolean(),
  node: NodeId.describe('The ID of the node that the job was started on. In serverless this will be the "serverless". If the job is allowed to open lazily and has not yet been assigned to a node, this value is an empty string.')
}).meta({ id: 'MlOpenJobResponse' })
export type MlOpenJobResponse = z.infer<typeof MlOpenJobResponse>

/** Add scheduled events to the calendar. */
export const MlPostCalendarEventsRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').meta({ found_in: 'path' }),
  events: z.array(MlCalendarEvent).describe('A list of one of more scheduled events. The event’s start and end times can be specified as integer milliseconds since the epoch or as a string in ISO 8601 format.').meta({ found_in: 'body' })
}).meta({ id: 'MlPostCalendarEventsRequest' })
export type MlPostCalendarEventsRequest = z.infer<typeof MlPostCalendarEventsRequest>

export const MlPostCalendarEventsResponse = z.object({
  events: z.array(MlCalendarEvent)
}).meta({ id: 'MlPostCalendarEventsResponse' })
export type MlPostCalendarEventsResponse = z.infer<typeof MlPostCalendarEventsResponse>

/**
 * Send data to an anomaly detection job for analysis.
 *
 * IMPORTANT: For each job, data can be accepted from only a single connection at a time.
 * It is not currently possible to post data to multiple jobs using wildcards or a comma-separated list.
 * @deprecated Posting data directly to anomaly detection jobs is deprecated, in a future major version a datafeed will be required.
 */
export const MlPostDataRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job. The job must have a state of open to receive and process the data.').meta({ found_in: 'path' }),
  reset_end: DateTime.describe('Specifies the end of the bucket resetting range.').optional().meta({ found_in: 'query' }),
  reset_start: DateTime.describe('Specifies the start of the bucket resetting range.').optional().meta({ found_in: 'query' }),
  data: z.array(z.any()).optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPostDataRequest' })
export type MlPostDataRequest = z.infer<typeof MlPostDataRequest>

export const MlPostDataResponse = z.object({
  job_id: Id,
  processed_record_count: long,
  processed_field_count: long,
  input_bytes: long,
  input_field_count: long,
  invalid_date_count: long,
  missing_field_count: long,
  out_of_order_timestamp_count: long,
  empty_bucket_count: long,
  sparse_bucket_count: long,
  bucket_count: long,
  earliest_record_timestamp: EpochTime.optional(),
  latest_record_timestamp: EpochTime.optional(),
  last_data_time: EpochTime.optional(),
  latest_empty_bucket_timestamp: EpochTime.optional(),
  latest_sparse_bucket_timestamp: EpochTime.optional(),
  input_record_count: long,
  log_time: EpochTime.optional()
}).meta({ id: 'MlPostDataResponse' })
export type MlPostDataResponse = z.infer<typeof MlPostDataResponse>

export const MlPreviewDataFrameAnalyticsDataframePreviewConfig = z.object({
  source: MlDataframeAnalyticsSource,
  analysis: MlDataframeAnalysisContainer,
  model_memory_limit: z.string().optional(),
  max_num_threads: integer.optional(),
  analyzed_fields: MlDataframeAnalysisAnalyzedFields.optional()
}).meta({ id: 'MlPreviewDataFrameAnalyticsDataframePreviewConfig' })
export type MlPreviewDataFrameAnalyticsDataframePreviewConfig = z.infer<typeof MlPreviewDataFrameAnalyticsDataframePreviewConfig>

/**
 * Preview features used by data frame analytics.
 *
 * Preview the extracted features used by a data frame analytics config.
 */
export const MlPreviewDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job.').optional().meta({ found_in: 'path' }),
  config: MlPreviewDataFrameAnalyticsDataframePreviewConfig.describe('A data frame analytics config as described in create data frame analytics jobs. Note that `id` and `dest` don’t need to be provided in the context of this API.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPreviewDataFrameAnalyticsRequest' })
export type MlPreviewDataFrameAnalyticsRequest = z.infer<typeof MlPreviewDataFrameAnalyticsRequest>

export const MlPreviewDataFrameAnalyticsResponse = z.object({
  feature_values: z.array(z.record(Field, z.string())).describe('An array of objects that contain feature name and value pairs. The features have been processed and indicate what will be sent to the model for training.')
}).meta({ id: 'MlPreviewDataFrameAnalyticsResponse' })
export type MlPreviewDataFrameAnalyticsResponse = z.infer<typeof MlPreviewDataFrameAnalyticsResponse>

/**
 * Preview a datafeed.
 *
 * This API returns the first "page" of search results from a datafeed.
 * You can preview an existing datafeed or provide configuration details for a datafeed
 * and anomaly detection job in the API. The preview shows the structure of the data
 * that will be passed to the anomaly detection engine.
 * IMPORTANT: When Elasticsearch security features are enabled, the preview uses the credentials of the user that
 * called the API. However, when the datafeed starts it uses the roles of the last user that created or updated the
 * datafeed. To get a preview that accurately reflects the behavior of the datafeed, use the appropriate credentials.
 * You can also use secondary authorization headers to supply the credentials.
 */
export const MlPreviewDatafeedRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters. NOTE: If you use this path parameter, you cannot provide datafeed or anomaly detection job configuration details in the request body.').optional().meta({ found_in: 'path' }),
  start: DateTime.describe('The start time from where the datafeed preview should begin').optional().meta({ found_in: 'query' }),
  end: DateTime.describe('The end time when the datafeed preview should stop').optional().meta({ found_in: 'query' }),
  datafeed_config: MlDatafeedConfig.describe('The datafeed definition to preview.').optional().meta({ found_in: 'body' }),
  job_config: MlJobConfig.describe('The configuration details for the anomaly detection job that is associated with the datafeed. If the `datafeed_config` object does not include a `job_id` that references an existing anomaly detection job, you must supply this `job_config` object. If you include both a `job_id` and a `job_config`, the latter information is used. You cannot specify a `job_config` object unless you also supply a `datafeed_config` object.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPreviewDatafeedRequest' })
export type MlPreviewDatafeedRequest = z.infer<typeof MlPreviewDatafeedRequest>

export const MlPreviewDatafeedResponse = z.array(z.any()).meta({ id: 'MlPreviewDatafeedResponse' })
export type MlPreviewDatafeedResponse = z.infer<typeof MlPreviewDatafeedResponse>

/** Create a calendar. */
export const MlPutCalendarRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').meta({ found_in: 'path' }),
  job_ids: z.array(Id).describe('An array of anomaly detection job identifiers.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('A description of the calendar.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutCalendarRequest' })
export type MlPutCalendarRequest = z.infer<typeof MlPutCalendarRequest>

export const MlPutCalendarResponse = z.object({
  calendar_id: Id.describe('A string that uniquely identifies a calendar.'),
  description: z.string().describe('A description of the calendar.').optional(),
  job_ids: Ids.describe('A list of anomaly detection job identifiers or group names.')
}).meta({ id: 'MlPutCalendarResponse' })
export type MlPutCalendarResponse = z.infer<typeof MlPutCalendarResponse>

/** Add anomaly detection job to calendar. */
export const MlPutCalendarJobRequest = z.object({
  ...RequestBase.shape,
  calendar_id: Id.describe('A string that uniquely identifies a calendar.').meta({ found_in: 'path' }),
  job_id: Ids.describe('An identifier for the anomaly detection jobs. It can be a job identifier, a group name, or a comma-separated list of jobs or groups.').meta({ found_in: 'path' })
}).meta({ id: 'MlPutCalendarJobRequest' })
export type MlPutCalendarJobRequest = z.infer<typeof MlPutCalendarJobRequest>

export const MlPutCalendarJobResponse = z.object({
  calendar_id: Id.describe('A string that uniquely identifies a calendar.'),
  description: z.string().describe('A description of the calendar.').optional(),
  job_ids: Ids.describe('A list of anomaly detection job identifiers or group names.')
}).meta({ id: 'MlPutCalendarJobResponse' })
export type MlPutCalendarJobResponse = z.infer<typeof MlPutCalendarJobResponse>

/**
 * Create a data frame analytics job.
 *
 * This API creates a data frame analytics job that performs an analysis on the
 * source indices and stores the outcome in a destination index.
 * By default, the query used in the source configuration is `{"match_all": {}}`.
 *
 * If the destination index does not exist, it is created automatically when you start the job.
 *
 * If you supply only a subset of the regression or classification parameters, hyperparameter optimization occurs. It determines a value for each of the undefined parameters.
 */
export const MlPutDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  allow_lazy_start: z.boolean().describe('Specifies whether this job can start when there is insufficient machine learning node capacity for it to be immediately assigned to a node. If set to `false` and a machine learning node with capacity to run the job cannot be immediately found, the API returns an error. If set to `true`, the API does not return an error; the job waits in the `starting` state until sufficient machine learning node capacity is available. This behavior is also affected by the cluster-wide `xpack.ml.max_lazy_ml_nodes` setting.').optional().meta({ found_in: 'body' }),
  analysis: MlDataframeAnalysisContainer.describe('The analysis configuration, which contains the information necessary to perform one of the following types of analysis: classification, outlier detection, or regression.').meta({ found_in: 'body' }),
  analyzed_fields: MlDataframeAnalysisAnalyzedFields.describe('Specifies `includes` and/or `excludes` patterns to select which fields will be included in the analysis. The patterns specified in `excludes` are applied last, therefore `excludes` takes precedence. In other words, if the same field is specified in both `includes` and `excludes`, then the field will not be included in the analysis. If `analyzed_fields` is not set, only the relevant fields will be included. For example, all the numeric fields for outlier detection. The supported fields vary for each type of analysis. Outlier detection requires numeric or `boolean` data to analyze. The algorithms don’t support missing values therefore fields that have data types other than numeric or boolean are ignored. Documents where included fields contain missing values, null values, or an array are also ignored. Therefore the `dest` index may contain documents that don’t have an outlier score. Regression supports fields that are numeric, `boolean`, `text`, `keyword`, and `ip` data types. It is also tolerant of missing values. Fields that are supported are included in the analysis, other fields are ignored. Documents where included fields contain an array with two or more values are also ignored. Documents in the `dest` index that don’t contain a results field are not included in the regression analysis. Classification supports fields that are numeric, `boolean`, `text`, `keyword`, and `ip` data types. It is also tolerant of missing values. Fields that are supported are included in the analysis, other fields are ignored. Documents where included fields contain an array with two or more values are also ignored. Documents in the `dest` index that don’t contain a results field are not included in the classification analysis. Classification analysis can be improved by mapping ordinal variable values to a single number. For example, in case of age ranges, you can model the values as `0-14 = 0`, `15-24 = 1`, `25-34 = 2`, and so on.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('A description of the job.').optional().meta({ found_in: 'body' }),
  dest: MlDataframeAnalyticsDestination.describe('The destination configuration.').meta({ found_in: 'body' }),
  max_num_threads: integer.describe('The maximum number of threads to be used by the analysis. Using more threads may decrease the time necessary to complete the analysis at the cost of using more CPU. Note that the process may use additional threads for operational functionality other than the analysis itself.').optional().meta({ found_in: 'body' }),
  _meta: Metadata.optional().meta({ found_in: 'body' }),
  model_memory_limit: z.string().describe('The approximate maximum amount of memory resources that are permitted for analytical processing. If your `elasticsearch.yml` file contains an `xpack.ml.max_model_memory_limit` setting, an error occurs when you try to create data frame analytics jobs that have `model_memory_limit` values greater than that setting.').optional().meta({ found_in: 'body' }),
  source: MlDataframeAnalyticsSource.describe('The configuration of how to source the analysis data.').meta({ found_in: 'body' }),
  headers: HttpHeaders.optional().meta({ found_in: 'body' }),
  version: VersionString.optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutDataFrameAnalyticsRequest' })
export type MlPutDataFrameAnalyticsRequest = z.infer<typeof MlPutDataFrameAnalyticsRequest>

export const MlPutDataFrameAnalyticsResponse = z.object({
  authorization: MlDataframeAnalyticsAuthorization.optional(),
  allow_lazy_start: z.boolean(),
  analysis: MlDataframeAnalysisContainer,
  analyzed_fields: MlDataframeAnalysisAnalyzedFields.optional(),
  create_time: EpochTime,
  description: z.string().optional(),
  dest: MlDataframeAnalyticsDestination,
  id: Id,
  max_num_threads: integer,
  _meta: Metadata.optional(),
  model_memory_limit: z.string(),
  source: MlDataframeAnalyticsSource,
  version: VersionString
}).meta({ id: 'MlPutDataFrameAnalyticsResponse' })
export type MlPutDataFrameAnalyticsResponse = z.infer<typeof MlPutDataFrameAnalyticsResponse>

/**
 * Create a datafeed.
 *
 * Datafeeds retrieve data from Elasticsearch for analysis by an anomaly detection job.
 * You can associate only one datafeed with each anomaly detection job.
 * The datafeed contains a query that runs at a defined interval (`frequency`).
 * If you are concerned about delayed data, you can add a delay (`query_delay') at each interval.
 * By default, the datafeed uses the following query: `{"match_all": {"boost": 1}}`.
 *
 * When Elasticsearch security features are enabled, your datafeed remembers which roles the user who created it had
 * at the time of creation and runs the query using those same roles. If you provide secondary authorization headers,
 * those credentials are used instead.
 * You must use Kibana, this API, or the create anomaly detection jobs API to create a datafeed. Do not add a datafeed
 * directly to the `.ml-config` index. Do not give users `write` privileges on the `.ml-config` index.
 */
export const MlPutDatafeedRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If true, concrete, expanded, or aliased indices are ignored when frozen.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('If set, the datafeed performs aggregation searches. Support for aggregations is limited and should be used only with low cardinality data.').optional().meta({ found_in: 'body' }),
  aggs: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('If set, the datafeed performs aggregation searches. Support for aggregations is limited and should be used only with low cardinality data.').optional(),
  chunking_config: MlChunkingConfig.describe('Datafeeds might be required to search over long time periods, for several months or years. This search is split into time chunks in order to ensure the load on Elasticsearch is managed. Chunking configuration controls how the size of these time chunks are calculated; it is an advanced configuration option.').optional().meta({ found_in: 'body' }),
  delayed_data_check_config: MlDelayedDataCheckConfig.describe('Specifies whether the datafeed checks for missing data and the size of the window. The datafeed can optionally search over indices that have already been read in an effort to determine whether any data has subsequently been added to the index. If missing data is found, it is a good indication that the `query_delay` is set too low and the data is being indexed after the datafeed has passed that moment in time. This check runs only on real-time datafeeds.').optional().meta({ found_in: 'body' }),
  frequency: Duration.describe('The interval at which scheduled queries are made while the datafeed runs in real time. The default value is either the bucket span for short bucket spans, or, for longer bucket spans, a sensible fraction of the bucket span. When `frequency` is shorter than the bucket span, interim results for the last (partial) bucket are written then eventually overwritten by the full bucket results. If the datafeed uses aggregations, this value must be divisible by the interval of the date histogram aggregation.').optional().meta({ found_in: 'body' }),
  indices: Indices.describe('An array of index names. Wildcards are supported. If any of the indices are in remote clusters, the master nodes and the machine learning nodes must have the `remote_cluster_client` role.').optional().meta({ found_in: 'body' }),
  indexes: Indices.describe('An array of index names. Wildcards are supported. If any of the indices are in remote clusters, the master nodes and the machine learning nodes must have the `remote_cluster_client` role.').optional(),
  indices_options: IndicesOptions.describe('Specifies index expansion options that are used during search').optional().meta({ found_in: 'body' }),
  job_id: Id.describe('Identifier for the anomaly detection job.').optional().meta({ found_in: 'body' }),
  max_empty_searches: integer.describe('If a real-time datafeed has never seen any data (including during any initial training period), it automatically stops and closes the associated job after this many real-time searches return no documents. In other words, it stops after `frequency` times `max_empty_searches` of real-time operation. If not set, a datafeed with no end time that sees no data remains started until it is explicitly stopped. By default, it is not set.').optional().meta({ found_in: 'body' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('The Elasticsearch query domain-specific language (DSL). This value corresponds to the query object in an Elasticsearch search POST body. All the options that are supported by Elasticsearch can be used, as this object is passed verbatim to Elasticsearch.').optional().meta({ found_in: 'body' }),
  query_delay: Duration.describe('The number of seconds behind real time that data is queried. For example, if data from 10:04 a.m. might not be searchable in Elasticsearch until 10:06 a.m., set this property to 120 seconds. The default value is randomly selected between `60s` and `120s`. This randomness improves the query performance when there are multiple jobs running on the same node.').optional().meta({ found_in: 'body' }),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('Specifies runtime fields for the datafeed search.').optional().meta({ found_in: 'body' }),
  script_fields: z.record(z.string(), z.lazy(() => ScriptField)).describe('Specifies scripts that evaluate custom expressions and returns script fields to the datafeed. The detector configuration objects in a job can contain functions that use these script fields.').optional().meta({ found_in: 'body' }),
  scroll_size: integer.describe('The size parameter that is used in Elasticsearch searches when the datafeed does not use aggregations. The maximum value is the value of `index.max_result_window`, which is 10,000 by default.').optional().meta({ found_in: 'body' }),
  headers: HttpHeaders.optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutDatafeedRequest' })
export type MlPutDatafeedRequest = z.infer<typeof MlPutDatafeedRequest>

export const MlPutDatafeedResponse = z.object({
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).optional(),
  authorization: MlDatafeedAuthorization.optional(),
  chunking_config: MlChunkingConfig,
  delayed_data_check_config: MlDelayedDataCheckConfig.optional(),
  datafeed_id: Id,
  frequency: Duration.optional(),
  indices: z.array(z.string()),
  job_id: Id,
  indices_options: IndicesOptions.optional(),
  max_empty_searches: integer.optional(),
  query: z.lazy(() => QueryDslQueryContainer),
  query_delay: Duration,
  runtime_mappings: z.lazy(() => MappingRuntimeFields).optional(),
  script_fields: z.record(z.string(), z.lazy(() => ScriptField)).optional(),
  scroll_size: integer
}).meta({ id: 'MlPutDatafeedResponse' })
export type MlPutDatafeedResponse = z.infer<typeof MlPutDatafeedResponse>

/**
 * Create a filter.
 *
 * A filter contains a list of strings. It can be used by one or more anomaly detection jobs.
 * Specifically, filters are referenced in the `custom_rules` property of detector configuration objects.
 */
export const MlPutFilterRequest = z.object({
  ...RequestBase.shape,
  filter_id: Id.describe('A string that uniquely identifies a filter.').meta({ found_in: 'path' }),
  description: z.string().describe('A description of the filter.').optional().meta({ found_in: 'body' }),
  items: z.array(z.string()).describe('The items of the filter. A wildcard `*` can be used at the beginning or the end of an item. Up to 10000 items are allowed in each filter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutFilterRequest' })
export type MlPutFilterRequest = z.infer<typeof MlPutFilterRequest>

export const MlPutFilterResponse = z.object({
  description: z.string(),
  filter_id: Id,
  items: z.array(z.string())
}).meta({ id: 'MlPutFilterResponse' })
export type MlPutFilterResponse = z.infer<typeof MlPutFilterResponse>

/**
 * Create an anomaly detection job.
 *
 * If you include a `datafeed_config`, you must have read index privileges on the source index.
 * If you include a `datafeed_config` but do not provide a query, the datafeed uses `{"match_all": {"boost": 1}}`.
 */
export const MlPutJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('The identifier for the anomaly detection job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If `true`, concrete, expanded or aliased indices are ignored when frozen.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  allow_lazy_open: z.boolean().describe('Advanced configuration option. Specifies whether this job can open when there is insufficient machine learning node capacity for it to be immediately assigned to a node. By default, if a machine learning node with capacity to run the job cannot immediately be found, the open anomaly detection jobs API returns an error. However, this is also subject to the cluster-wide `xpack.ml.max_lazy_ml_nodes` setting. If this option is set to true, the open anomaly detection jobs API does not return an error and the job waits in the opening state until sufficient machine learning node capacity is available.').optional().meta({ found_in: 'body' }),
  analysis_config: MlAnalysisConfig.describe('Specifies how to analyze the data. After you create a job, you cannot change the analysis configuration; all the properties are informational.').meta({ found_in: 'body' }),
  analysis_limits: MlAnalysisLimits.describe('Limits can be applied for the resources required to hold the mathematical models in memory. These limits are approximate and can be set per job. They do not control the memory used by other processes, for example the Elasticsearch Java processes.').optional().meta({ found_in: 'body' }),
  background_persist_interval: Duration.describe('Advanced configuration option. The time between each periodic persistence of the model. The default value is a randomized value between 3 to 4 hours, which avoids all jobs persisting at exactly the same time. The smallest allowed value is 1 hour. For very large models (several GB), persistence could take 10-20 minutes, so do not set the `background_persist_interval` value too low.').optional().meta({ found_in: 'body' }),
  custom_settings: MlCustomSettings.describe('Advanced configuration option. Contains custom meta data about the job.').optional().meta({ found_in: 'body' }),
  daily_model_snapshot_retention_after_days: long.describe('Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies a period of time (in days) after which only the first snapshot per day is retained. This period is relative to the timestamp of the most recent snapshot for this job. Valid values range from 0 to `model_snapshot_retention_days`.').optional().meta({ found_in: 'body' }),
  data_description: MlDataDescription.describe('Defines the format of the input data when you send data to the job by using the post data API. Note that when configure a datafeed, these properties are automatically set. When data is received via the post data API, it is not stored in Elasticsearch. Only the results for anomaly detection are retained.').meta({ found_in: 'body' }),
  datafeed_config: MlDatafeedConfig.describe('Defines a datafeed for the anomaly detection job. If Elasticsearch security features are enabled, your datafeed remembers which roles the user who created it had at the time of creation and runs the query using those same roles. If you provide secondary authorization headers, those credentials are used instead.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('A description of the job.').optional().meta({ found_in: 'body' }),
  groups: z.array(z.string()).describe('A list of job groups. A job can belong to no groups or many.').optional().meta({ found_in: 'body' }),
  model_plot_config: MlModelPlotConfig.describe('This advanced configuration option stores model information along with the results. It provides a more detailed view into anomaly detection. If you enable model plot it can add considerable overhead to the performance of the system; it is not feasible for jobs with many entities. Model plot provides a simplified and indicative view of the model and its bounds. It does not display complex features such as multivariate correlations or multimodal data. As such, anomalies may occasionally be reported which cannot be seen in the model plot. Model plot config can be configured when the job is created or updated later. It must be disabled if performance issues are experienced.').optional().meta({ found_in: 'body' }),
  model_snapshot_retention_days: long.describe('Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies the maximum period of time (in days) that snapshots are retained. This period is relative to the timestamp of the most recent snapshot for this job. By default, snapshots ten days older than the newest snapshot are deleted.').optional().meta({ found_in: 'body' }),
  renormalization_window_days: long.describe('Advanced configuration option. The period over which adjustments to the score are applied, as new data is seen. The default value is the longer of 30 days or 100 bucket spans.').optional().meta({ found_in: 'body' }),
  results_index_name: IndexName.describe('A text string that affects the name of the machine learning results index. By default, the job generates an index named `.ml-anomalies-shared`.').optional().meta({ found_in: 'body' }),
  results_retention_days: long.describe('Advanced configuration option. The period of time (in days) that results are retained. Age is calculated relative to the timestamp of the latest bucket result. If this property has a non-null value, once per day at 00:30 (server time), results that are the specified number of days older than the latest bucket result are deleted from Elasticsearch. The default value is null, which means all results are retained. Annotations generated by the system also count as results for retention purposes; they are deleted after the same number of days as results. Annotations added by users are retained forever.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutJobRequest' })
export type MlPutJobRequest = z.infer<typeof MlPutJobRequest>

export const MlPutJobResponse = z.object({
  allow_lazy_open: z.boolean(),
  analysis_config: MlAnalysisConfigRead,
  analysis_limits: MlAnalysisLimits,
  background_persist_interval: Duration.optional(),
  create_time: DateTime,
  custom_settings: MlCustomSettings.optional(),
  daily_model_snapshot_retention_after_days: long,
  data_description: MlDataDescription,
  datafeed_config: MlDatafeed.optional(),
  description: z.string().optional(),
  groups: z.array(z.string()).optional(),
  job_id: Id,
  job_type: z.string(),
  job_version: z.string(),
  model_plot_config: MlModelPlotConfig.optional(),
  model_snapshot_id: Id.optional(),
  model_snapshot_retention_days: long,
  renormalization_window_days: long.optional(),
  results_index_name: z.string(),
  results_retention_days: long.optional()
}).meta({ id: 'MlPutJobResponse' })
export type MlPutJobResponse = z.infer<typeof MlPutJobResponse>

export const MlPutTrainedModelWeights = z.object({
  weights: double
}).meta({ id: 'MlPutTrainedModelWeights' })
export type MlPutTrainedModelWeights = z.infer<typeof MlPutTrainedModelWeights>

export const MlPutTrainedModelAggregateOutput = z.object({
  logistic_regression: MlPutTrainedModelWeights.optional(),
  weighted_sum: MlPutTrainedModelWeights.optional(),
  weighted_mode: MlPutTrainedModelWeights.optional(),
  exponent: MlPutTrainedModelWeights.optional()
}).meta({ id: 'MlPutTrainedModelAggregateOutput' })
export type MlPutTrainedModelAggregateOutput = z.infer<typeof MlPutTrainedModelAggregateOutput>

export const MlPutTrainedModelFrequencyEncodingPreprocessor = z.object({
  field: z.string(),
  feature_name: z.string(),
  frequency_map: z.record(z.string(), double)
}).meta({ id: 'MlPutTrainedModelFrequencyEncodingPreprocessor' })
export type MlPutTrainedModelFrequencyEncodingPreprocessor = z.infer<typeof MlPutTrainedModelFrequencyEncodingPreprocessor>

export const MlPutTrainedModelOneHotEncodingPreprocessor = z.object({
  field: z.string(),
  hot_map: z.record(z.string(), z.string())
}).meta({ id: 'MlPutTrainedModelOneHotEncodingPreprocessor' })
export type MlPutTrainedModelOneHotEncodingPreprocessor = z.infer<typeof MlPutTrainedModelOneHotEncodingPreprocessor>

export const MlPutTrainedModelTargetMeanEncodingPreprocessor = z.object({
  field: z.string(),
  feature_name: z.string(),
  target_map: z.record(z.string(), double),
  default_value: double
}).meta({ id: 'MlPutTrainedModelTargetMeanEncodingPreprocessor' })
export type MlPutTrainedModelTargetMeanEncodingPreprocessor = z.infer<typeof MlPutTrainedModelTargetMeanEncodingPreprocessor>

const MlPutTrainedModelPreprocessorExclusiveProps = z.union([z.object({ frequency_encoding: MlPutTrainedModelFrequencyEncodingPreprocessor }), z.object({ one_hot_encoding: MlPutTrainedModelOneHotEncodingPreprocessor }), z.object({ target_mean_encoding: MlPutTrainedModelTargetMeanEncodingPreprocessor })])

export const MlPutTrainedModelPreprocessor = MlPutTrainedModelPreprocessorExclusiveProps.meta({ id: 'MlPutTrainedModelPreprocessor' })
export type MlPutTrainedModelPreprocessor = z.infer<typeof MlPutTrainedModelPreprocessor>

export const MlPutTrainedModelTrainedModelTreeNode = z.object({
  decision_type: z.string().optional(),
  default_left: z.boolean().optional(),
  leaf_value: double.optional(),
  left_child: integer.optional(),
  node_index: integer,
  right_child: integer.optional(),
  split_feature: integer.optional(),
  split_gain: integer.optional(),
  threshold: double.optional()
}).meta({ id: 'MlPutTrainedModelTrainedModelTreeNode' })
export type MlPutTrainedModelTrainedModelTreeNode = z.infer<typeof MlPutTrainedModelTrainedModelTreeNode>

export const MlPutTrainedModelTrainedModelTree = z.object({
  classification_labels: z.array(z.string()).optional(),
  feature_names: z.array(z.string()),
  target_type: z.string().optional(),
  tree_structure: z.array(MlPutTrainedModelTrainedModelTreeNode)
}).meta({ id: 'MlPutTrainedModelTrainedModelTree' })
export type MlPutTrainedModelTrainedModelTree = z.infer<typeof MlPutTrainedModelTrainedModelTree>

export interface MlPutTrainedModelEnsembleShape {
  aggregate_output?: MlPutTrainedModelAggregateOutput | undefined
  classification_labels?: string[] | undefined
  feature_names?: string[] | undefined
  target_type?: string | undefined
  trained_models: MlPutTrainedModelTrainedModelShape[]
}
export const MlPutTrainedModelEnsemble = z.object({
  aggregate_output: MlPutTrainedModelAggregateOutput.optional(),
  classification_labels: z.array(z.string()).optional(),
  feature_names: z.array(z.string()).optional(),
  target_type: z.string().optional(),
  get trained_models () { return MlPutTrainedModelTrainedModel.array() }
}).meta({ id: 'MlPutTrainedModelEnsemble' })
export type MlPutTrainedModelEnsemble = z.infer<typeof MlPutTrainedModelEnsemble>

export interface MlPutTrainedModelTrainedModelShape {
  tree?: MlPutTrainedModelTrainedModelTree | undefined
  tree_node?: MlPutTrainedModelTrainedModelTreeNode | undefined
  ensemble?: MlPutTrainedModelEnsembleShape | undefined
}
export const MlPutTrainedModelTrainedModel = z.object({
  tree: MlPutTrainedModelTrainedModelTree.describe('The definition for a binary decision tree.').optional(),
  tree_node: MlPutTrainedModelTrainedModelTreeNode.describe('The definition of a node in a tree. There are two major types of nodes: leaf nodes and not-leaf nodes. - Leaf nodes only need node_index and leaf_value defined. - All other nodes need split_feature, left_child, right_child, threshold, decision_type, and default_left defined.').optional(),
  get ensemble () { return MlPutTrainedModelEnsemble.describe('The definition for an ensemble model').optional() }
}).meta({ id: 'MlPutTrainedModelTrainedModel' })
export type MlPutTrainedModelTrainedModel = z.infer<typeof MlPutTrainedModelTrainedModel>

export const MlPutTrainedModelDefinition = z.object({
  preprocessors: z.array(MlPutTrainedModelPreprocessor).describe('Collection of preprocessors').optional(),
  trained_model: z.lazy(() => MlPutTrainedModelTrainedModel).describe('The definition of the trained model.')
}).meta({ id: 'MlPutTrainedModelDefinition' })
export type MlPutTrainedModelDefinition = z.infer<typeof MlPutTrainedModelDefinition>

export const MlPutTrainedModelInput = z.object({
  field_names: Names
}).meta({ id: 'MlPutTrainedModelInput' })
export type MlPutTrainedModelInput = z.infer<typeof MlPutTrainedModelInput>

/**
 * Create a trained model.
 *
 * Enable you to supply a trained model that is not created by data frame analytics.
 */
export const MlPutTrainedModelRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  defer_definition_decompression: z.boolean().describe('If set to `true` and a `compressed_definition` is provided, the request defers definition decompression and skips relevant validations.').optional().meta({ found_in: 'query' }),
  wait_for_completion: z.boolean().describe('Whether to wait for all child operations (e.g. model download) to complete.').optional().meta({ found_in: 'query' }),
  compressed_definition: z.string().describe('The compressed (GZipped and Base64 encoded) inference definition of the model. If compressed_definition is specified, then definition cannot be specified.').optional().meta({ found_in: 'body' }),
  definition: MlPutTrainedModelDefinition.describe('The inference definition for the model. If definition is specified, then compressed_definition cannot be specified.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('A human-readable description of the inference trained model.').optional().meta({ found_in: 'body' }),
  inference_config: MlInferenceConfigCreateContainer.describe('The default configuration for inference. This can be either a regression or classification configuration. It must match the underlying definition.trained_model\'s target_type. For pre-packaged models such as ELSER the config is not required.').optional().meta({ found_in: 'body' }),
  input: MlPutTrainedModelInput.describe('The input field names for the model definition.').optional().meta({ found_in: 'body' }),
  metadata: z.any().describe('An object map that contains metadata about the model.').optional().meta({ found_in: 'body' }),
  model_type: MlTrainedModelType.describe('The model type.').optional().meta({ found_in: 'body' }),
  model_size_bytes: long.describe('The estimated memory usage in bytes to keep the trained model in memory. This property is supported only if defer_definition_decompression is true or the model definition is not supplied.').optional().meta({ found_in: 'body' }),
  platform_architecture: z.string().describe('The platform architecture (if applicable) of the trained mode. If the model only works on one platform, because it is heavily optimized for a particular processor architecture and OS combination, then this field specifies which. The format of the string must match the platform identifiers used by Elasticsearch, so one of, `linux-x86_64`, `linux-aarch64`, `darwin-x86_64`, `darwin-aarch64`, or `windows-x86_64`. For portable models (those that work independent of processor architecture or OS features), leave this field unset.').optional().meta({ found_in: 'body' }),
  tags: z.array(z.string()).describe('An array of tags to organize the model.').optional().meta({ found_in: 'body' }),
  prefix_strings: MlTrainedModelPrefixStrings.describe('Optional prefix strings applied at inference').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutTrainedModelRequest' })
export type MlPutTrainedModelRequest = z.infer<typeof MlPutTrainedModelRequest>

export const MlPutTrainedModelResponse = MlTrainedModelConfig.meta({ id: 'MlPutTrainedModelResponse' })
export type MlPutTrainedModelResponse = z.infer<typeof MlPutTrainedModelResponse>

/**
 * Create or update a trained model alias.
 *
 * A trained model alias is a logical name used to reference a single trained
 * model.
 * You can use aliases instead of trained model identifiers to make it easier to
 * reference your models. For example, you can use aliases in inference
 * aggregations and processors.
 * An alias must be unique and refer to only a single trained model. However,
 * you can have multiple aliases for each trained model.
 * If you use this API to update an alias such that it references a different
 * trained model ID and the model uses a different type of data frame analytics,
 * an error occurs. For example, this situation occurs if you have a trained
 * model for regression analysis and a trained model for classification
 * analysis; you cannot reassign an alias from one type of trained model to
 * another.
 * If you use this API to update an alias and there are very few input fields in
 * common between the old and new trained models for the model alias, the API
 * returns a warning.
 */
export const MlPutTrainedModelAliasRequest = z.object({
  ...RequestBase.shape,
  model_alias: Name.describe('The alias to create or update. This value cannot end in numbers.').meta({ found_in: 'path' }),
  model_id: Id.describe('The identifier for the trained model that the alias refers to.').meta({ found_in: 'path' }),
  reassign: z.boolean().describe('Specifies whether the alias gets reassigned to the specified trained model if it is already assigned to a different model. If the alias is already assigned and this parameter is false, the API returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlPutTrainedModelAliasRequest' })
export type MlPutTrainedModelAliasRequest = z.infer<typeof MlPutTrainedModelAliasRequest>

export const MlPutTrainedModelAliasResponse = AcknowledgedResponseBase.meta({ id: 'MlPutTrainedModelAliasResponse' })
export type MlPutTrainedModelAliasResponse = z.infer<typeof MlPutTrainedModelAliasResponse>

/** Create part of a trained model definition. */
export const MlPutTrainedModelDefinitionPartRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  part: integer.describe('The definition part number. When the definition is loaded for inference the definition parts are streamed in the order of their part number. The first part must be `0` and the final part must be `total_parts - 1`.').meta({ found_in: 'path' }),
  definition: z.string().describe('The definition part for the model. Must be a base64 encoded string.').meta({ found_in: 'body' }),
  total_definition_length: long.describe('The total uncompressed definition length in bytes. Not base64 encoded.').meta({ found_in: 'body' }),
  total_parts: integer.describe('The total number of parts that will be uploaded. Must be greater than 0.').meta({ found_in: 'body' })
}).meta({ id: 'MlPutTrainedModelDefinitionPartRequest' })
export type MlPutTrainedModelDefinitionPartRequest = z.infer<typeof MlPutTrainedModelDefinitionPartRequest>

export const MlPutTrainedModelDefinitionPartResponse = AcknowledgedResponseBase.meta({ id: 'MlPutTrainedModelDefinitionPartResponse' })
export type MlPutTrainedModelDefinitionPartResponse = z.infer<typeof MlPutTrainedModelDefinitionPartResponse>

/**
 * Create a trained model vocabulary.
 *
 * This API is supported only for natural language processing (NLP) models.
 * The vocabulary is stored in the index as described in `inference_config.*.vocabulary` of the trained model definition.
 */
export const MlPutTrainedModelVocabularyRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  vocabulary: z.array(z.string()).describe('The model vocabulary, which must not be empty.').meta({ found_in: 'body' }),
  merges: z.array(z.string()).describe('The optional model merges if required by the tokenizer.').optional().meta({ found_in: 'body' }),
  scores: z.array(double).describe('The optional vocabulary value scores if required by the tokenizer.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlPutTrainedModelVocabularyRequest' })
export type MlPutTrainedModelVocabularyRequest = z.infer<typeof MlPutTrainedModelVocabularyRequest>

export const MlPutTrainedModelVocabularyResponse = AcknowledgedResponseBase.meta({ id: 'MlPutTrainedModelVocabularyResponse' })
export type MlPutTrainedModelVocabularyResponse = z.infer<typeof MlPutTrainedModelVocabularyResponse>

/**
 * Reset an anomaly detection job.
 *
 * All model state and results are deleted. The job is ready to start over as if
 * it had just been created.
 * It is not currently possible to reset multiple jobs using wildcards or a
 * comma separated list.
 */
export const MlResetJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('The ID of the job to reset.').meta({ found_in: 'path' }),
  wait_for_completion: z.boolean().describe('Should this request wait until the operation has completed before returning.').optional().meta({ found_in: 'query' }),
  delete_user_annotations: z.boolean().describe('Specifies whether annotations that have been added by the user should be deleted along with any auto-generated annotations when the job is reset.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlResetJobRequest' })
export type MlResetJobRequest = z.infer<typeof MlResetJobRequest>

export const MlResetJobResponse = AcknowledgedResponseBase.meta({ id: 'MlResetJobResponse' })
export type MlResetJobResponse = z.infer<typeof MlResetJobResponse>

/**
 * Revert to a snapshot.
 *
 * The machine learning features react quickly to anomalous input, learning new
 * behaviors in data. Highly anomalous input increases the variance in the
 * models whilst the system learns whether this is a new step-change in behavior
 * or a one-off event. In the case where this anomalous input is known to be a
 * one-off, then it might be appropriate to reset the model state to a time
 * before this event. For example, you might consider reverting to a saved
 * snapshot after Black Friday or a critical system failure.
 */
export const MlRevertModelSnapshotRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('You can specify `empty` as the <snapshot_id>. Reverting to the empty snapshot means the anomaly detection job starts learning a new model from scratch when it is started.').meta({ found_in: 'path' }),
  delete_intervening_results: z.boolean().describe('Refer to the description for the `delete_intervening_results` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlRevertModelSnapshotRequest' })
export type MlRevertModelSnapshotRequest = z.infer<typeof MlRevertModelSnapshotRequest>

export const MlRevertModelSnapshotResponse = z.object({
  model: MlModelSnapshot
}).meta({ id: 'MlRevertModelSnapshotResponse' })
export type MlRevertModelSnapshotResponse = z.infer<typeof MlRevertModelSnapshotResponse>

/**
 * Set upgrade_mode for ML indices.
 *
 * Sets a cluster wide upgrade_mode setting that prepares machine learning
 * indices for an upgrade.
 * When upgrading your cluster, in some circumstances you must restart your
 * nodes and reindex your machine learning indices. In those circumstances,
 * there must be no machine learning jobs running. You can close the machine
 * learning jobs, do the upgrade, then open all the jobs again. Alternatively,
 * you can use this API to temporarily halt tasks associated with the jobs and
 * datafeeds and prevent new jobs from opening. You can also use this API
 * during upgrades that do not require you to reindex your machine learning
 * indices, though stopping jobs is not a requirement in that case.
 * You can see the current value for the upgrade_mode setting by using the get
 * machine learning info API.
 */
export const MlSetUpgradeModeRequest = z.object({
  ...RequestBase.shape,
  enabled: z.boolean().describe('When `true`, it enables `upgrade_mode` which temporarily halts all job and datafeed tasks and prohibits new job and datafeed tasks from starting.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The time to wait for the request to be completed.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlSetUpgradeModeRequest' })
export type MlSetUpgradeModeRequest = z.infer<typeof MlSetUpgradeModeRequest>

export const MlSetUpgradeModeResponse = AcknowledgedResponseBase.meta({ id: 'MlSetUpgradeModeResponse' })
export type MlSetUpgradeModeResponse = z.infer<typeof MlSetUpgradeModeResponse>

/**
 * Start a data frame analytics job.
 *
 * A data frame analytics job can be started and stopped multiple times
 * throughout its lifecycle.
 * If the destination index does not exist, it is created automatically the
 * first time you start the data frame analytics job. The
 * `index.number_of_shards` and `index.number_of_replicas` settings for the
 * destination index are copied from the source index. If there are multiple
 * source indices, the destination index copies the highest setting values. The
 * mappings for the destination index are also copied from the source indices.
 * If there are any mapping conflicts, the job fails to start.
 * If the destination index exists, it is used as is. You can therefore set up
 * the destination index in advance with custom settings and mappings.
 */
export const MlStartDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  timeout: Duration.describe('Controls the amount of time to wait until the data frame analytics job starts.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStartDataFrameAnalyticsRequest' })
export type MlStartDataFrameAnalyticsRequest = z.infer<typeof MlStartDataFrameAnalyticsRequest>

export const MlStartDataFrameAnalyticsResponse = z.object({
  acknowledged: z.boolean(),
  node: NodeId.describe('The ID of the node that the job was started on. If the job is allowed to open lazily and has not yet been assigned to a node, this value is an empty string. The node ID of the node the job has been assigned to, or an empty string if it hasn\'t been assigned to a node. In serverless if the job has been assigned to run then the node ID will be "serverless".')
}).meta({ id: 'MlStartDataFrameAnalyticsResponse' })
export type MlStartDataFrameAnalyticsResponse = z.infer<typeof MlStartDataFrameAnalyticsResponse>

/**
 * Start datafeeds.
 *
 * A datafeed must be started in order to retrieve data from Elasticsearch. A datafeed can be started and stopped
 * multiple times throughout its lifecycle.
 *
 * Before you can start a datafeed, the anomaly detection job must be open. Otherwise, an error occurs.
 *
 * If you restart a stopped datafeed, it continues processing input data from the next millisecond after it was stopped.
 * If new data was indexed for that exact millisecond between stopping and starting, it will be ignored.
 *
 * When Elasticsearch security features are enabled, your datafeed remembers which roles the last user to create or
 * update it had at the time of creation or update and runs the query using those same roles. If you provided secondary
 * authorization headers when you created or updated the datafeed, those credentials are used instead.
 */
export const MlStartDatafeedRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  end: DateTime.describe('Refer to the description for the `end` query parameter.').optional().meta({ found_in: 'body' }),
  start: DateTime.describe('Refer to the description for the `start` query parameter.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('Refer to the description for the `timeout` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStartDatafeedRequest' })
export type MlStartDatafeedRequest = z.infer<typeof MlStartDatafeedRequest>

export const MlStartDatafeedResponse = z.object({
  node: NodeIds.describe('The ID of the node that the job was started on. In serverless this will be the "serverless". If the job is allowed to open lazily and has not yet been assigned to a node, this value is an empty string.'),
  started: z.boolean().describe('For a successful response, this value is always `true`. On failure, an exception is returned instead.')
}).meta({ id: 'MlStartDatafeedResponse' })
export type MlStartDatafeedResponse = z.infer<typeof MlStartDatafeedResponse>

/**
 * Start a trained model deployment.
 *
 * It allocates the model to every machine learning node.
 */
export const MlStartTrainedModelDeploymentRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model. Currently, only PyTorch models are supported.').meta({ found_in: 'path' }),
  cache_size: ByteSize.describe('The inference cache size (in memory outside the JVM heap) per node for the model. The default value is the same size as the `model_size_bytes`. To disable the cache, `0b` can be provided.').optional().meta({ found_in: 'query' }),
  number_of_allocations: integer.describe('The number of model allocations on each node where the model is deployed. All allocations on a node share the same copy of the model in memory but use a separate set of threads to evaluate the model. Increasing this value generally increases the throughput. If this setting is greater than the number of hardware threads it will automatically be changed to a value less than the number of hardware threads. If adaptive_allocations is enabled, do not set this value, because it’s automatically set.').optional().meta({ found_in: 'query' }),
  priority: MlTrainingPriority.describe('The deployment priority').optional().meta({ found_in: 'query' }),
  queue_capacity: integer.describe('Specifies the number of inference requests that are allowed in the queue. After the number of requests exceeds this value, new requests are rejected with a 429 error.').optional().meta({ found_in: 'query' }),
  threads_per_allocation: integer.describe('Sets the number of threads used by each model allocation during inference. This generally increases the inference speed. The inference process is a compute-bound process; any number greater than the number of available hardware threads on the machine does not increase the inference speed. If this setting is greater than the number of hardware threads it will automatically be changed to a value less than the number of hardware threads.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Specifies the amount of time to wait for the model to deploy.').optional().meta({ found_in: 'query' }),
  wait_for: MlDeploymentAllocationState.describe('Specifies the allocation status to wait for before returning.').optional().meta({ found_in: 'query' }),
  adaptive_allocations: MlAdaptiveAllocationsSettings.describe('Adaptive allocations configuration. When enabled, the number of allocations is set based on the current load. If adaptive_allocations is enabled, do not set the number of allocations manually.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStartTrainedModelDeploymentRequest' })
export type MlStartTrainedModelDeploymentRequest = z.infer<typeof MlStartTrainedModelDeploymentRequest>

export const MlStartTrainedModelDeploymentResponse = z.object({
  assignment: MlTrainedModelAssignment
}).meta({ id: 'MlStartTrainedModelDeploymentResponse' })
export type MlStartTrainedModelDeploymentResponse = z.infer<typeof MlStartTrainedModelDeploymentResponse>

/**
 * Stop data frame analytics jobs.
 *
 * A data frame analytics job can be started and stopped multiple times
 * throughout its lifecycle.
 */
export const MlStopDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: 1. Contains wildcard expressions and there are no data frame analytics jobs that match. 2. Contains the _all string or no identifiers and there are no matches. 3. Contains wildcard expressions and there are only partial matches. The default value is true, which returns an empty data_frame_analytics array when there are no matches and the subset of results when there are partial matches. If this parameter is false, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'body' }),
  force: z.boolean().describe('If true, the data frame analytics job is stopped forcefully.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('Controls the amount of time to wait until the data frame analytics job stops. Defaults to 20 seconds.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStopDataFrameAnalyticsRequest' })
export type MlStopDataFrameAnalyticsRequest = z.infer<typeof MlStopDataFrameAnalyticsRequest>

export const MlStopDataFrameAnalyticsResponse = z.object({
  stopped: z.boolean()
}).meta({ id: 'MlStopDataFrameAnalyticsResponse' })
export type MlStopDataFrameAnalyticsResponse = z.infer<typeof MlStopDataFrameAnalyticsResponse>

/**
 * Stop datafeeds.
 *
 * A datafeed that is stopped ceases to retrieve data from Elasticsearch. A datafeed can be started and stopped
 * multiple times throughout its lifecycle.
 */
export const MlStopDatafeedRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Id.describe('Identifier for the datafeed. You can stop multiple datafeeds in a single API request by using a comma-separated list of datafeeds or a wildcard expression. You can close all datafeeds by using `_all` or by specifying `*` as the identifier.').meta({ found_in: 'path' }),
  allow_no_match: z.boolean().describe('Refer to the description for the `allow_no_match` query parameter.').optional().meta({ found_in: 'body' }),
  force: z.boolean().describe('Refer to the description for the `force` query parameter.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('Refer to the description for the `timeout` query parameter.').optional().meta({ found_in: 'body' }),
  close_job: z.boolean().describe('Refer to the description for the `close_job` query parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStopDatafeedRequest' })
export type MlStopDatafeedRequest = z.infer<typeof MlStopDatafeedRequest>

export const MlStopDatafeedResponse = z.object({
  stopped: z.boolean()
}).meta({ id: 'MlStopDatafeedResponse' })
export type MlStopDatafeedResponse = z.infer<typeof MlStopDatafeedResponse>

/** Stop a trained model deployment. */
export const MlStopTrainedModelDeploymentRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model.').meta({ found_in: 'path' }),
  id: Id.describe('If provided, must be the same identifier as in the path.').optional().meta({ found_in: 'body' }),
  allow_no_match: z.boolean().describe('Specifies what to do when the request: contains wildcard expressions and there are no deployments that match; contains the  `_all` string or no identifiers and there are no matches; or contains wildcard expressions and there are only partial matches. By default, it returns an empty array when there are no matches and the subset of results when there are partial matches. If `false`, the request returns a 404 status code when there are no matches or only partial matches.').optional().meta({ found_in: 'body' }),
  force: z.boolean().describe('Forcefully stops the deployment, even if it is used by ingest pipelines. You can\'t use these pipelines until you restart the model deployment.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlStopTrainedModelDeploymentRequest' })
export type MlStopTrainedModelDeploymentRequest = z.infer<typeof MlStopTrainedModelDeploymentRequest>

export const MlStopTrainedModelDeploymentResponse = z.object({
  stopped: z.boolean()
}).meta({ id: 'MlStopTrainedModelDeploymentResponse' })
export type MlStopTrainedModelDeploymentResponse = z.infer<typeof MlStopTrainedModelDeploymentResponse>

/** Update a data frame analytics job. */
export const MlUpdateDataFrameAnalyticsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Identifier for the data frame analytics job. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  description: z.string().describe('A description of the job.').optional().meta({ found_in: 'body' }),
  model_memory_limit: z.string().describe('The approximate maximum amount of memory resources that are permitted for analytical processing. If your `elasticsearch.yml` file contains an `xpack.ml.max_model_memory_limit` setting, an error occurs when you try to create data frame analytics jobs that have `model_memory_limit` values greater than that setting.').optional().meta({ found_in: 'body' }),
  max_num_threads: integer.describe('The maximum number of threads to be used by the analysis. Using more threads may decrease the time necessary to complete the analysis at the cost of using more CPU. Note that the process may use additional threads for operational functionality other than the analysis itself.').optional().meta({ found_in: 'body' }),
  allow_lazy_start: z.boolean().describe('Specifies whether this job can start when there is insufficient machine learning node capacity for it to be immediately assigned to a node.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlUpdateDataFrameAnalyticsRequest' })
export type MlUpdateDataFrameAnalyticsRequest = z.infer<typeof MlUpdateDataFrameAnalyticsRequest>

export const MlUpdateDataFrameAnalyticsResponse = z.object({
  authorization: MlDataframeAnalyticsAuthorization.optional(),
  allow_lazy_start: z.boolean(),
  analysis: MlDataframeAnalysisContainer,
  analyzed_fields: MlDataframeAnalysisAnalyzedFields.optional(),
  create_time: long,
  description: z.string().optional(),
  dest: MlDataframeAnalyticsDestination,
  id: Id,
  max_num_threads: integer,
  model_memory_limit: z.string(),
  source: MlDataframeAnalyticsSource,
  version: VersionString
}).meta({ id: 'MlUpdateDataFrameAnalyticsResponse' })
export type MlUpdateDataFrameAnalyticsResponse = z.infer<typeof MlUpdateDataFrameAnalyticsResponse>

/**
 * Update a datafeed.
 *
 * You must stop and start the datafeed for the changes to be applied.
 * When Elasticsearch security features are enabled, your datafeed remembers which roles the user who updated it had at
 * the time of the update and runs the query using those same roles. If you provide secondary authorization headers,
 * those credentials are used instead.
 */
export const MlUpdateDatafeedRequest = z.object({
  ...RequestBase.shape,
  datafeed_id: Id.describe('A numerical character string that uniquely identifies the datafeed. This identifier can contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must start and end with alphanumeric characters.').meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('Type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values.').optional().meta({ found_in: 'query' }),
  ignore_throttled: z.boolean().describe('If `true`, concrete, expanded or aliased indices are ignored when frozen.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).describe('If set, the datafeed performs aggregation searches. Support for aggregations is limited and should be used only with low cardinality data.').optional().meta({ found_in: 'body' }),
  chunking_config: MlChunkingConfig.describe('Datafeeds might search over long time periods, for several months or years. This search is split into time chunks in order to ensure the load on Elasticsearch is managed. Chunking configuration controls how the size of these time chunks are calculated; it is an advanced configuration option.').optional().meta({ found_in: 'body' }),
  delayed_data_check_config: MlDelayedDataCheckConfig.describe('Specifies whether the datafeed checks for missing data and the size of the window. The datafeed can optionally search over indices that have already been read in an effort to determine whether any data has subsequently been added to the index. If missing data is found, it is a good indication that the `query_delay` is set too low and the data is being indexed after the datafeed has passed that moment in time. This check runs only on real-time datafeeds.').optional().meta({ found_in: 'body' }),
  frequency: Duration.describe('The interval at which scheduled queries are made while the datafeed runs in real time. The default value is either the bucket span for short bucket spans, or, for longer bucket spans, a sensible fraction of the bucket span. When `frequency` is shorter than the bucket span, interim results for the last (partial) bucket are written then eventually overwritten by the full bucket results. If the datafeed uses aggregations, this value must be divisible by the interval of the date histogram aggregation.').optional().meta({ found_in: 'body' }),
  indices: z.array(z.string()).describe('An array of index names. Wildcards are supported. If any of the indices are in remote clusters, the machine learning nodes must have the `remote_cluster_client` role.').optional().meta({ found_in: 'body' }),
  indexes: z.array(z.string()).describe('An array of index names. Wildcards are supported. If any of the indices are in remote clusters, the machine learning nodes must have the `remote_cluster_client` role.').optional(),
  indices_options: IndicesOptions.describe('Specifies index expansion options that are used during search.').optional().meta({ found_in: 'body' }),
  job_id: Id.optional().meta({ found_in: 'body' }),
  max_empty_searches: integer.describe('If a real-time datafeed has never seen any data (including during any initial training period), it automatically stops and closes the associated job after this many real-time searches return no documents. In other words, it stops after `frequency` times `max_empty_searches` of real-time operation. If not set, a datafeed with no end time that sees no data remains started until it is explicitly stopped. By default, it is not set.').optional().meta({ found_in: 'body' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('The Elasticsearch query domain-specific language (DSL). This value corresponds to the query object in an Elasticsearch search POST body. All the options that are supported by Elasticsearch can be used, as this object is passed verbatim to Elasticsearch. Note that if you change the query, the analyzed data is also changed. Therefore, the time required to learn might be long and the understandability of the results is unpredictable. If you want to make significant changes to the source data, it is recommended that you clone the job and datafeed and make the amendments in the clone. Let both run in parallel and close one when you are satisfied with the results of the job.').optional().meta({ found_in: 'body' }),
  query_delay: Duration.describe('The number of seconds behind real time that data is queried. For example, if data from 10:04 a.m. might not be searchable in Elasticsearch until 10:06 a.m., set this property to 120 seconds. The default value is randomly selected between `60s` and `120s`. This randomness improves the query performance when there are multiple jobs running on the same node.').optional().meta({ found_in: 'body' }),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('Specifies runtime fields for the datafeed search.').optional().meta({ found_in: 'body' }),
  script_fields: z.record(z.string(), z.lazy(() => ScriptField)).describe('Specifies scripts that evaluate custom expressions and returns script fields to the datafeed. The detector configuration objects in a job can contain functions that use these script fields.').optional().meta({ found_in: 'body' }),
  scroll_size: integer.describe('The size parameter that is used in Elasticsearch searches when the datafeed does not use aggregations. The maximum value is the value of `index.max_result_window`.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlUpdateDatafeedRequest' })
export type MlUpdateDatafeedRequest = z.infer<typeof MlUpdateDatafeedRequest>

export const MlUpdateDatafeedResponse = z.object({
  authorization: MlDatafeedAuthorization.optional(),
  aggregations: z.record(z.string(), z.lazy(() => AggregationsAggregationContainer)).optional(),
  chunking_config: MlChunkingConfig,
  delayed_data_check_config: MlDelayedDataCheckConfig.optional(),
  datafeed_id: Id,
  frequency: Duration.describe('The interval at which scheduled queries are made while the datafeed runs in real time. The default value is either the bucket span for short bucket spans, or, for longer bucket spans, a sensible fraction of the bucket span. For example: `150s`. When `frequency` is shorter than the bucket span, interim results for the last (partial) bucket are written then eventually overwritten by the full bucket results. If the datafeed uses aggregations, this value must be divisible by the interval of the date histogram aggregation.').optional(),
  indices: z.array(z.string()),
  indices_options: IndicesOptions.optional(),
  job_id: Id,
  max_empty_searches: integer.optional(),
  query: z.lazy(() => QueryDslQueryContainer),
  query_delay: Duration,
  runtime_mappings: z.lazy(() => MappingRuntimeFields).optional(),
  script_fields: z.record(z.string(), z.lazy(() => ScriptField)).optional(),
  scroll_size: integer
}).meta({ id: 'MlUpdateDatafeedResponse' })
export type MlUpdateDatafeedResponse = z.infer<typeof MlUpdateDatafeedResponse>

/**
 * Update a filter.
 *
 * Updates the description of a filter, adds items, or removes items from the list.
 */
export const MlUpdateFilterRequest = z.object({
  ...RequestBase.shape,
  filter_id: Id.describe('A string that uniquely identifies a filter.').meta({ found_in: 'path' }),
  add_items: z.array(z.string()).describe('The items to add to the filter.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('A description for the filter.').optional().meta({ found_in: 'body' }),
  remove_items: z.array(z.string()).describe('The items to remove from the filter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlUpdateFilterRequest' })
export type MlUpdateFilterRequest = z.infer<typeof MlUpdateFilterRequest>

export const MlUpdateFilterResponse = z.object({
  description: z.string(),
  filter_id: Id,
  items: z.array(z.string())
}).meta({ id: 'MlUpdateFilterResponse' })
export type MlUpdateFilterResponse = z.infer<typeof MlUpdateFilterResponse>

/**
 * Update an anomaly detection job.
 *
 * Updates certain properties of an anomaly detection job.
 */
export const MlUpdateJobRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the job.').meta({ found_in: 'path' }),
  allow_lazy_open: z.boolean().describe('Advanced configuration option. Specifies whether this job can open when there is insufficient machine learning node capacity for it to be immediately assigned to a node. If `false` and a machine learning node with capacity to run the job cannot immediately be found, the open anomaly detection jobs API returns an error. However, this is also subject to the cluster-wide `xpack.ml.max_lazy_ml_nodes` setting. If this option is set to `true`, the open anomaly detection jobs API does not return an error and the job waits in the opening state until sufficient machine learning node capacity is available.').optional().meta({ found_in: 'body' }),
  analysis_limits: MlAnalysisMemoryLimit.optional().meta({ found_in: 'body' }),
  background_persist_interval: Duration.describe('Advanced configuration option. The time between each periodic persistence of the model. The default value is a randomized value between 3 to 4 hours, which avoids all jobs persisting at exactly the same time. The smallest allowed value is 1 hour. For very large models (several GB), persistence could take 10-20 minutes, so do not set the value too low. If the job is open when you make the update, you must stop the datafeed, close the job, then reopen the job and restart the datafeed for the changes to take effect.').optional().meta({ found_in: 'body' }),
  custom_settings: z.record(z.string(), z.any()).describe('Advanced configuration option. Contains custom meta data about the job. For example, it can contain custom URL information as shown in Adding custom URLs to machine learning results.').optional().meta({ found_in: 'body' }),
  categorization_filters: z.array(z.string()).optional().meta({ found_in: 'body' }),
  description: z.string().describe('A description of the job.').optional().meta({ found_in: 'body' }),
  model_plot_config: MlModelPlotConfig.optional().meta({ found_in: 'body' }),
  model_prune_window: Duration.optional().meta({ found_in: 'body' }),
  daily_model_snapshot_retention_after_days: long.describe('Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies a period of time (in days) after which only the first snapshot per day is retained. This period is relative to the timestamp of the most recent snapshot for this job. Valid values range from 0 to `model_snapshot_retention_days`. For jobs created before version 7.8.0, the default value matches `model_snapshot_retention_days`.').optional().meta({ found_in: 'body' }),
  model_snapshot_retention_days: long.describe('Advanced configuration option, which affects the automatic removal of old model snapshots for this job. It specifies the maximum period of time (in days) that snapshots are retained. This period is relative to the timestamp of the most recent snapshot for this job.').optional().meta({ found_in: 'body' }),
  renormalization_window_days: long.describe('Advanced configuration option. The period over which adjustments to the score are applied, as new data is seen.').optional().meta({ found_in: 'body' }),
  results_retention_days: long.describe('Advanced configuration option. The period of time (in days) that results are retained. Age is calculated relative to the timestamp of the latest bucket result. If this property has a non-null value, once per day at 00:30 (server time), results that are the specified number of days older than the latest bucket result are deleted from Elasticsearch. The default value is null, which means all results are retained.').optional().meta({ found_in: 'body' }),
  groups: z.array(z.string()).describe('A list of job groups. A job can belong to no groups or many.').optional().meta({ found_in: 'body' }),
  detectors: z.array(MlDetectorUpdate).describe('An array of detector update objects.').optional().meta({ found_in: 'body' }),
  per_partition_categorization: MlPerPartitionCategorization.describe('Settings related to how categorization interacts with partition fields.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlUpdateJobRequest' })
export type MlUpdateJobRequest = z.infer<typeof MlUpdateJobRequest>

export const MlUpdateJobResponse = z.object({
  allow_lazy_open: z.boolean(),
  analysis_config: MlAnalysisConfigRead,
  analysis_limits: MlAnalysisLimits,
  background_persist_interval: Duration.optional(),
  create_time: EpochTime,
  finished_time: EpochTime.optional(),
  custom_settings: z.record(z.string(), z.string()).optional(),
  daily_model_snapshot_retention_after_days: long,
  data_description: MlDataDescription,
  datafeed_config: MlDatafeed.optional(),
  description: z.string().optional(),
  groups: z.array(z.string()).optional(),
  job_id: Id,
  job_type: z.string(),
  job_version: VersionString,
  model_plot_config: MlModelPlotConfig.optional(),
  model_snapshot_id: Id.optional(),
  model_snapshot_retention_days: long,
  renormalization_window_days: long.optional(),
  results_index_name: IndexName,
  results_retention_days: long.optional()
}).meta({ id: 'MlUpdateJobResponse' })
export type MlUpdateJobResponse = z.infer<typeof MlUpdateJobResponse>

/**
 * Update a snapshot.
 *
 * Updates certain properties of a snapshot.
 */
export const MlUpdateModelSnapshotRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('Identifier for the model snapshot.').meta({ found_in: 'path' }),
  description: z.string().describe('A description of the model snapshot.').optional().meta({ found_in: 'body' }),
  retain: z.boolean().describe('If `true`, this snapshot will not be deleted during automatic cleanup of snapshots older than `model_snapshot_retention_days`. However, this snapshot will be deleted when the job is deleted.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlUpdateModelSnapshotRequest' })
export type MlUpdateModelSnapshotRequest = z.infer<typeof MlUpdateModelSnapshotRequest>

export const MlUpdateModelSnapshotResponse = z.object({
  acknowledged: z.boolean(),
  model: MlModelSnapshot
}).meta({ id: 'MlUpdateModelSnapshotResponse' })
export type MlUpdateModelSnapshotResponse = z.infer<typeof MlUpdateModelSnapshotResponse>

/** Update a trained model deployment. */
export const MlUpdateTrainedModelDeploymentRequest = z.object({
  ...RequestBase.shape,
  model_id: Id.describe('The unique identifier of the trained model. Currently, only PyTorch models are supported.').meta({ found_in: 'path' }),
  number_of_allocations: integer.describe('The number of model allocations on each node where the model is deployed. All allocations on a node share the same copy of the model in memory but use a separate set of threads to evaluate the model. Increasing this value generally increases the throughput. If this setting is greater than the number of hardware threads it will automatically be changed to a value less than the number of hardware threads. If adaptive_allocations is enabled, do not set this value, because it’s automatically set.').optional().meta({ found_in: 'body' }),
  adaptive_allocations: MlAdaptiveAllocationsSettings.describe('Adaptive allocations configuration. When enabled, the number of allocations is set based on the current load. If adaptive_allocations is enabled, do not set the number of allocations manually.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MlUpdateTrainedModelDeploymentRequest' })
export type MlUpdateTrainedModelDeploymentRequest = z.infer<typeof MlUpdateTrainedModelDeploymentRequest>

export const MlUpdateTrainedModelDeploymentResponse = z.object({
  assignment: MlTrainedModelAssignment
}).meta({ id: 'MlUpdateTrainedModelDeploymentResponse' })
export type MlUpdateTrainedModelDeploymentResponse = z.infer<typeof MlUpdateTrainedModelDeploymentResponse>

/**
 * Upgrade a snapshot.
 *
 * Upgrade an anomaly detection model snapshot to the latest major version.
 * Over time, older snapshot formats are deprecated and removed. Anomaly
 * detection jobs support only snapshots that are from the current or previous
 * major version.
 * This API provides a means to upgrade a snapshot to the current major version.
 * This aids in preparing the cluster for an upgrade to the next major version.
 * Only one snapshot per anomaly detection job can be upgraded at a time and the
 * upgraded snapshot cannot be the current snapshot of the anomaly detection
 * job.
 */
export const MlUpgradeJobSnapshotRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.describe('Identifier for the anomaly detection job.').meta({ found_in: 'path' }),
  snapshot_id: Id.describe('A numerical character string that uniquely identifies the model snapshot.').meta({ found_in: 'path' }),
  wait_for_completion: z.boolean().describe('When true, the API won’t respond until the upgrade is complete. Otherwise, it responds as soon as the upgrade task is assigned to a node.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Controls the time to wait for the request to complete.').optional().meta({ found_in: 'query' })
}).meta({ id: 'MlUpgradeJobSnapshotRequest' })
export type MlUpgradeJobSnapshotRequest = z.infer<typeof MlUpgradeJobSnapshotRequest>

export const MlUpgradeJobSnapshotResponse = z.object({
  node: NodeId.describe('The ID of the node that the upgrade task was started on if it is still running. In serverless this will be the "serverless".'),
  completed: z.boolean().describe('When true, this means the task is complete. When false, it is still running.')
}).meta({ id: 'MlUpgradeJobSnapshotResponse' })
export type MlUpgradeJobSnapshotResponse = z.infer<typeof MlUpgradeJobSnapshotResponse>

/** Validate an anomaly detection job. */
export const MlValidateRequest = z.object({
  ...RequestBase.shape,
  job_id: Id.optional().meta({ found_in: 'body' }),
  analysis_config: MlAnalysisConfig.optional().meta({ found_in: 'body' }),
  analysis_limits: MlAnalysisLimits.optional().meta({ found_in: 'body' }),
  data_description: MlDataDescription.optional().meta({ found_in: 'body' }),
  description: z.string().optional().meta({ found_in: 'body' }),
  model_plot: MlModelPlotConfig.optional().meta({ found_in: 'body' }),
  model_snapshot_id: Id.optional().meta({ found_in: 'body' }),
  model_snapshot_retention_days: long.optional().meta({ found_in: 'body' }),
  results_index_name: IndexName.optional().meta({ found_in: 'body' })
}).meta({ id: 'MlValidateRequest' })
export type MlValidateRequest = z.infer<typeof MlValidateRequest>

export const MlValidateResponse = AcknowledgedResponseBase.meta({ id: 'MlValidateResponse' })
export type MlValidateResponse = z.infer<typeof MlValidateResponse>

/** Validate an anomaly detection job. */
export const MlValidateDetectorRequest = z.object({
  ...RequestBase.shape,
  detector: MlDetector.optional().meta({ found_in: 'body' })
}).meta({ id: 'MlValidateDetectorRequest' })
export type MlValidateDetectorRequest = z.infer<typeof MlValidateDetectorRequest>

export const MlValidateDetectorResponse = AcknowledgedResponseBase.meta({ id: 'MlValidateDetectorResponse' })
export type MlValidateDetectorResponse = z.infer<typeof MlValidateDetectorResponse>
