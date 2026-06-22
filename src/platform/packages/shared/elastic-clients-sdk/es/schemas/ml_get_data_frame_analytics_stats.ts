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

export const DurationValue = z.any().meta({ id: 'DurationValue' })
export type DurationValue = z.infer<typeof DurationValue>

export const EpochTime = z.any().meta({ id: 'EpochTime' })
export type EpochTime = z.infer<typeof EpochTime>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

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
