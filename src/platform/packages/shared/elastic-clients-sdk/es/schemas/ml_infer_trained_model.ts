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

/**
 * A duration. Units can be `nanos`, `micros`, `ms` (milliseconds), `s` (seconds), `m` (minutes), `h` (hours) and
 * `d` (days). Also accepts "0" without a unit and "-1" to indicate an unspecified value.
 */
export const Duration = z.union([z.string(), z.literal(-1), z.literal(0)]).meta({ id: 'Duration' })
export type Duration = z.infer<typeof Duration>

/** Path to field or array of paths. Some API's support wildcards in the path to select multiple fields. */
export const Field = z.string().meta({ id: 'Field' })
export type Field = z.infer<typeof Field>

export const Id = z.string().meta({ id: 'Id' })
export type Id = z.infer<typeof Id>

export const RequestBase = z.object({
}).meta({ id: 'RequestBase' })
export type RequestBase = z.infer<typeof RequestBase>

export const long = z.number().meta({ id: 'long' })
export type long = z.infer<typeof long>

export const double = z.number().meta({ id: 'double' })
export type double = z.infer<typeof double>

/** A scalar value. */
export const ScalarValue = z.union([long, double, z.string(), z.boolean(), z.null()]).meta({ id: 'ScalarValue' })
export type ScalarValue = z.infer<typeof ScalarValue>

export const integer = z.number().meta({ id: 'integer' })
export type integer = z.infer<typeof integer>

export const MlClassificationInferenceOptions = z.object({
  num_top_classes: integer.describe('Specifies the number of top class predictions to return. Defaults to 0.').optional(),
  num_top_feature_importance_values: integer.describe('Specifies the maximum number of feature importance values per document.').optional(),
  prediction_field_type: z.string().describe('Specifies the type of the predicted field to write. Acceptable values are: string, number, boolean. When boolean is provided 1.0 is transformed to true and 0.0 to false.').optional(),
  results_field: z.string().describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  top_classes_results_field: z.string().describe('Specifies the field to which the top classes are written. Defaults to top_classes.').optional()
}).meta({ id: 'MlClassificationInferenceOptions' })
export type MlClassificationInferenceOptions = z.infer<typeof MlClassificationInferenceOptions>

export const MlTokenizationTruncate = z.enum(['first', 'second', 'none']).meta({ id: 'MlTokenizationTruncate' })
export type MlTokenizationTruncate = z.infer<typeof MlTokenizationTruncate>

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

export const MlRegressionInferenceOptions = z.object({
  results_field: Field.describe('The field that is added to incoming documents to contain the inference prediction. Defaults to predicted_value.').optional(),
  num_top_feature_importance_values: integer.describe('Specifies the maximum number of feature importance values per document.').optional()
}).meta({ id: 'MlRegressionInferenceOptions' })
export type MlRegressionInferenceOptions = z.infer<typeof MlRegressionInferenceOptions>

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

const MlInferenceConfigUpdateContainerExclusiveProps = z.union([z.object({ regression: MlRegressionInferenceOptions }), z.object({ classification: MlClassificationInferenceOptions }), z.object({ text_classification: MlTextClassificationInferenceUpdateOptions }), z.object({ zero_shot_classification: MlZeroShotClassificationInferenceUpdateOptions }), z.object({ fill_mask: MlFillMaskInferenceUpdateOptions }), z.object({ ner: MlNerInferenceUpdateOptions }), z.object({ pass_through: MlPassThroughInferenceUpdateOptions }), z.object({ text_embedding: MlTextEmbeddingInferenceUpdateOptions }), z.object({ text_expansion: MlTextExpansionInferenceUpdateOptions }), z.object({ question_answering: MlQuestionAnsweringInferenceUpdateOptions })])

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
