/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ScriptSource, TransformContainer } from './_global.search'
import { AcknowledgedResponseBase, DateTime, Duration, DurationValue, EpochTime, ErrorCause, Field, FieldValue, Host, HttpHeaders, Id, IndexName, IndicesOptions, Metadata, Name, Names, NodeStatistics, OpType, Password, Refresh, RequestBase, Result, ScriptLanguage, SearchType, SequenceNumber, SortResults, Username, VersionNumber, integer, long, uint } from './_types'
import { QueryDslQueryContainer, Sort } from './_types.query_dsl'
import { IndicesIndexSettings } from './indices'

export const WatcherSearchInputRequestBody = z.object({
  query: z.lazy(() => QueryDslQueryContainer)
}).meta({ id: 'WatcherSearchInputRequestBody' })
export type WatcherSearchInputRequestBody = z.infer<typeof WatcherSearchInputRequestBody>

export const WatcherSearchTemplateRequestBody = z.object({
  explain: z.boolean().optional(),
  id: Id.describe('ID of the search template to use. If no source is specified, this parameter is required.').optional(),
  params: z.record(z.string(), z.any()).optional(),
  profile: z.boolean().optional(),
  source: z.string().describe('An inline search template. Supports the same parameters as the search API\'s request body. Also supports Mustache variables. If no id is specified, this parameter is required.').optional()
}).meta({ id: 'WatcherSearchTemplateRequestBody' })
export type WatcherSearchTemplateRequestBody = z.infer<typeof WatcherSearchTemplateRequestBody>

export const WatcherSearchInputRequestDefinition = z.object({
  body: WatcherSearchInputRequestBody.optional(),
  indices: z.array(IndexName).optional(),
  indices_options: IndicesOptions.optional(),
  search_type: SearchType.optional(),
  template: WatcherSearchTemplateRequestBody.optional(),
  rest_total_hits_as_int: z.boolean().optional()
}).meta({ id: 'WatcherSearchInputRequestDefinition' })
export type WatcherSearchInputRequestDefinition = z.infer<typeof WatcherSearchInputRequestDefinition>

export const SearchTransform = z.object({
  request: WatcherSearchInputRequestDefinition,
  timeout: Duration
}).meta({ id: 'SearchTransform' })
export type SearchTransform = z.infer<typeof SearchTransform>

export const WatcherHourAndMinute = z.object({
  hour: z.array(integer),
  minute: z.array(integer)
}).meta({ id: 'WatcherHourAndMinute' })
export type WatcherHourAndMinute = z.infer<typeof WatcherHourAndMinute>

/** A time of day, expressed either as `hh:mm`, `noon`, `midnight`, or an hour/minutes structure. */
export const WatcherScheduleTimeOfDay = z.union([z.string(), WatcherHourAndMinute]).meta({ id: 'WatcherScheduleTimeOfDay' })
export type WatcherScheduleTimeOfDay = z.infer<typeof WatcherScheduleTimeOfDay>

export const WatcherCronExpression = z.string().meta({ id: 'WatcherCronExpression' })
export type WatcherCronExpression = z.infer<typeof WatcherCronExpression>

export const WatcherAcknowledgementOptions = z.enum(['awaits_successful_execution', 'ackable', 'acked']).meta({ id: 'WatcherAcknowledgementOptions' })
export type WatcherAcknowledgementOptions = z.infer<typeof WatcherAcknowledgementOptions>

export const WatcherAcknowledgeState = z.object({
  state: WatcherAcknowledgementOptions,
  timestamp: DateTime
}).meta({ id: 'WatcherAcknowledgeState' })
export type WatcherAcknowledgeState = z.infer<typeof WatcherAcknowledgeState>

export const WatcherActionType = z.enum(['email', 'webhook', 'index', 'logging', 'slack', 'pagerduty']).meta({ id: 'WatcherActionType' })
export type WatcherActionType = z.infer<typeof WatcherActionType>

export const WatcherAlwaysCondition = z.object({
}).meta({ id: 'WatcherAlwaysCondition' })
export type WatcherAlwaysCondition = z.infer<typeof WatcherAlwaysCondition>

export const WatcherArrayCompareCondition = z.object({
  path: z.string()
}).catchall(z.any()).meta({ id: 'WatcherArrayCompareCondition' })
export type WatcherArrayCompareCondition = z.infer<typeof WatcherArrayCompareCondition>

export const WatcherConditionOp = z.enum(['not_eq', 'eq', 'lt', 'gt', 'lte', 'gte']).meta({ id: 'WatcherConditionOp' })
export type WatcherConditionOp = z.infer<typeof WatcherConditionOp>

export const WatcherNeverCondition = z.object({
}).meta({ id: 'WatcherNeverCondition' })
export type WatcherNeverCondition = z.infer<typeof WatcherNeverCondition>

export const WatcherScriptCondition = z.object({
  lang: ScriptLanguage.optional(),
  params: z.record(z.string(), z.any()).optional(),
  source: z.lazy(() => ScriptSource).optional(),
  id: z.string().optional()
}).meta({ id: 'WatcherScriptCondition' })
export type WatcherScriptCondition = z.infer<typeof WatcherScriptCondition>

const WatcherConditionContainerExclusiveProps = z.union([z.object({ always: WatcherAlwaysCondition }), z.object({ array_compare: z.record(z.string(), WatcherArrayCompareCondition) }), z.object({ compare: z.record(z.string(), z.record(WatcherConditionOp, FieldValue)) }), z.object({ never: WatcherNeverCondition }), z.object({ script: WatcherScriptCondition })])

export const WatcherConditionContainer = WatcherConditionContainerExclusiveProps.meta({ id: 'WatcherConditionContainer' })
export type WatcherConditionContainer = z.infer<typeof WatcherConditionContainer>

export const WatcherIndexAction = z.object({
  index: IndexName,
  doc_id: Id.optional(),
  refresh: Refresh.optional(),
  op_type: OpType.optional(),
  timeout: Duration.optional(),
  execution_time_field: Field.optional()
}).meta({ id: 'WatcherIndexAction' })
export type WatcherIndexAction = z.infer<typeof WatcherIndexAction>

export const WatcherLoggingAction = z.object({
  level: z.string().optional(),
  text: z.string(),
  category: z.string().optional()
}).meta({ id: 'WatcherLoggingAction' })
export type WatcherLoggingAction = z.infer<typeof WatcherLoggingAction>

export const WatcherEmailBody = z.object({
  html: z.string().optional(),
  text: z.string().optional()
}).meta({ id: 'WatcherEmailBody' })
export type WatcherEmailBody = z.infer<typeof WatcherEmailBody>

export const WatcherEmailPriority = z.enum(['lowest', 'low', 'normal', 'high', 'highest']).meta({ id: 'WatcherEmailPriority' })
export type WatcherEmailPriority = z.infer<typeof WatcherEmailPriority>

export const WatcherHttpInputBasicAuthentication = z.object({
  password: Password,
  username: Username
}).meta({ id: 'WatcherHttpInputBasicAuthentication' })
export type WatcherHttpInputBasicAuthentication = z.infer<typeof WatcherHttpInputBasicAuthentication>

export const WatcherHttpInputAuthentication = z.object({
  basic: WatcherHttpInputBasicAuthentication
}).meta({ id: 'WatcherHttpInputAuthentication' })
export type WatcherHttpInputAuthentication = z.infer<typeof WatcherHttpInputAuthentication>

export const WatcherHttpInputMethod = z.enum(['head', 'get', 'post', 'put', 'delete']).meta({ id: 'WatcherHttpInputMethod' })
export type WatcherHttpInputMethod = z.infer<typeof WatcherHttpInputMethod>

export const WatcherHttpInputProxy = z.object({
  host: Host,
  port: uint
}).meta({ id: 'WatcherHttpInputProxy' })
export type WatcherHttpInputProxy = z.infer<typeof WatcherHttpInputProxy>

export const WatcherConnectionScheme = z.enum(['http', 'https']).meta({ id: 'WatcherConnectionScheme' })
export type WatcherConnectionScheme = z.infer<typeof WatcherConnectionScheme>

export const WatcherHttpInputRequestDefinition = z.object({
  auth: WatcherHttpInputAuthentication.optional(),
  body: z.string().optional(),
  connection_timeout: Duration.optional(),
  headers: z.record(z.string(), z.string()).optional(),
  host: Host.optional(),
  method: WatcherHttpInputMethod.optional(),
  params: z.record(z.string(), z.string()).optional(),
  path: z.string().optional(),
  port: uint.optional(),
  proxy: WatcherHttpInputProxy.optional(),
  read_timeout: Duration.optional(),
  scheme: WatcherConnectionScheme.optional(),
  url: z.string().optional()
}).meta({ id: 'WatcherHttpInputRequestDefinition' })
export type WatcherHttpInputRequestDefinition = z.infer<typeof WatcherHttpInputRequestDefinition>

export const WatcherHttpEmailAttachment = z.object({
  content_type: z.string().optional(),
  inline: z.boolean().optional(),
  request: WatcherHttpInputRequestDefinition.optional()
}).meta({ id: 'WatcherHttpEmailAttachment' })
export type WatcherHttpEmailAttachment = z.infer<typeof WatcherHttpEmailAttachment>

export const WatcherReportingEmailAttachment = z.object({
  url: z.string(),
  inline: z.boolean().optional(),
  retries: integer.optional(),
  interval: Duration.optional(),
  request: WatcherHttpInputRequestDefinition.optional()
}).meta({ id: 'WatcherReportingEmailAttachment' })
export type WatcherReportingEmailAttachment = z.infer<typeof WatcherReportingEmailAttachment>

export const WatcherDataAttachmentFormat = z.enum(['json', 'yaml']).meta({ id: 'WatcherDataAttachmentFormat' })
export type WatcherDataAttachmentFormat = z.infer<typeof WatcherDataAttachmentFormat>

export const WatcherDataEmailAttachment = z.object({
  format: WatcherDataAttachmentFormat.optional()
}).meta({ id: 'WatcherDataEmailAttachment' })
export type WatcherDataEmailAttachment = z.infer<typeof WatcherDataEmailAttachment>

const WatcherEmailAttachmentContainerExclusiveProps = z.union([z.object({ http: WatcherHttpEmailAttachment }), z.object({ reporting: WatcherReportingEmailAttachment }), z.object({ data: WatcherDataEmailAttachment })])

export const WatcherEmailAttachmentContainer = WatcherEmailAttachmentContainerExclusiveProps.meta({ id: 'WatcherEmailAttachmentContainer' })
export type WatcherEmailAttachmentContainer = z.infer<typeof WatcherEmailAttachmentContainer>

export const WatcherEmail = z.object({
  id: Id.optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  body: WatcherEmailBody.optional(),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  from: z.string().optional(),
  priority: WatcherEmailPriority.optional(),
  reply_to: z.union([z.string(), z.array(z.string())]).optional(),
  sent_date: DateTime.optional(),
  subject: z.string(),
  to: z.union([z.string(), z.array(z.string())]),
  attachments: z.record(z.string(), WatcherEmailAttachmentContainer).optional()
}).meta({ id: 'WatcherEmail' })
export type WatcherEmail = z.infer<typeof WatcherEmail>

export const WatcherEmailAction = z.object({
  ...WatcherEmail.shape
}).meta({ id: 'WatcherEmailAction' })
export type WatcherEmailAction = z.infer<typeof WatcherEmailAction>

export const WatcherPagerDutyContextType = z.enum(['link', 'image']).meta({ id: 'WatcherPagerDutyContextType' })
export type WatcherPagerDutyContextType = z.infer<typeof WatcherPagerDutyContextType>

export const WatcherPagerDutyContext = z.object({
  href: z.string().optional(),
  src: z.string().optional(),
  type: WatcherPagerDutyContextType
}).meta({ id: 'WatcherPagerDutyContext' })
export type WatcherPagerDutyContext = z.infer<typeof WatcherPagerDutyContext>

export const WatcherPagerDutyEventType = z.enum(['trigger', 'resolve', 'acknowledge']).meta({ id: 'WatcherPagerDutyEventType' })
export type WatcherPagerDutyEventType = z.infer<typeof WatcherPagerDutyEventType>

export const WatcherPagerDutyEventProxy = z.object({
  host: Host.optional(),
  port: integer.optional()
}).meta({ id: 'WatcherPagerDutyEventProxy' })
export type WatcherPagerDutyEventProxy = z.infer<typeof WatcherPagerDutyEventProxy>

export const WatcherPagerDutyEvent = z.object({
  account: z.string().optional(),
  attach_payload: z.boolean(),
  client: z.string().optional(),
  client_url: z.string().optional(),
  contexts: z.array(WatcherPagerDutyContext).optional(),
  context: z.array(WatcherPagerDutyContext).optional(),
  description: z.string(),
  event_type: WatcherPagerDutyEventType.optional(),
  incident_key: z.string(),
  proxy: WatcherPagerDutyEventProxy.optional()
}).meta({ id: 'WatcherPagerDutyEvent' })
export type WatcherPagerDutyEvent = z.infer<typeof WatcherPagerDutyEvent>

export const WatcherPagerDutyAction = z.object({
  ...WatcherPagerDutyEvent.shape
}).meta({ id: 'WatcherPagerDutyAction' })
export type WatcherPagerDutyAction = z.infer<typeof WatcherPagerDutyAction>

export const WatcherSlackAttachmentField = z.object({
  short: z.boolean(),
  title: z.string(),
  value: z.string()
}).meta({ id: 'WatcherSlackAttachmentField' })
export type WatcherSlackAttachmentField = z.infer<typeof WatcherSlackAttachmentField>

export const WatcherSlackAttachment = z.object({
  author_icon: z.string().optional(),
  author_link: z.string().optional(),
  author_name: z.string(),
  color: z.string().optional(),
  fallback: z.string().optional(),
  fields: z.array(WatcherSlackAttachmentField).optional(),
  footer: z.string().optional(),
  footer_icon: z.string().optional(),
  image_url: z.string().optional(),
  pretext: z.string().optional(),
  text: z.string().optional(),
  thumb_url: z.string().optional(),
  title: z.string(),
  title_link: z.string().optional(),
  ts: EpochTime.optional()
}).meta({ id: 'WatcherSlackAttachment' })
export type WatcherSlackAttachment = z.infer<typeof WatcherSlackAttachment>

export const WatcherSlackDynamicAttachment = z.object({
  attachment_template: WatcherSlackAttachment,
  list_path: z.string()
}).meta({ id: 'WatcherSlackDynamicAttachment' })
export type WatcherSlackDynamicAttachment = z.infer<typeof WatcherSlackDynamicAttachment>

export const WatcherSlackMessage = z.object({
  attachments: z.array(WatcherSlackAttachment),
  dynamic_attachments: WatcherSlackDynamicAttachment.optional(),
  from: z.string(),
  icon: z.string().optional(),
  text: z.string(),
  to: z.array(z.string())
}).meta({ id: 'WatcherSlackMessage' })
export type WatcherSlackMessage = z.infer<typeof WatcherSlackMessage>

export const WatcherSlackAction = z.object({
  account: z.string().optional(),
  message: WatcherSlackMessage
}).meta({ id: 'WatcherSlackAction' })
export type WatcherSlackAction = z.infer<typeof WatcherSlackAction>

export const WatcherWebhookAction = z.object({
  ...WatcherHttpInputRequestDefinition.shape
}).meta({ id: 'WatcherWebhookAction' })
export type WatcherWebhookAction = z.infer<typeof WatcherWebhookAction>

export const WatcherAction = z.object({
  action_type: WatcherActionType.optional(),
  condition: WatcherConditionContainer.optional(),
  foreach: z.string().optional(),
  max_iterations: integer.optional(),
  name: Name.optional(),
  throttle_period: Duration.optional(),
  throttle_period_in_millis: DurationValue.optional(),
  transform: z.lazy(() => TransformContainer).optional(),
  index: WatcherIndexAction.optional(),
  logging: WatcherLoggingAction.optional(),
  email: WatcherEmailAction.optional(),
  pagerduty: WatcherPagerDutyAction.optional(),
  slack: WatcherSlackAction.optional(),
  webhook: WatcherWebhookAction.optional()
}).meta({ id: 'WatcherAction' })
export type WatcherAction = z.infer<typeof WatcherAction>

export const WatcherActionExecutionMode = z.enum(['simulate', 'force_simulate', 'execute', 'force_execute', 'skip']).meta({ id: 'WatcherActionExecutionMode' })
export type WatcherActionExecutionMode = z.infer<typeof WatcherActionExecutionMode>

export const WatcherExecutionState = z.object({
  successful: z.boolean(),
  timestamp: DateTime,
  reason: z.string().optional()
}).meta({ id: 'WatcherExecutionState' })
export type WatcherExecutionState = z.infer<typeof WatcherExecutionState>

export const WatcherThrottleState = z.object({
  reason: z.string(),
  timestamp: DateTime
}).meta({ id: 'WatcherThrottleState' })
export type WatcherThrottleState = z.infer<typeof WatcherThrottleState>

export const WatcherActionStatus = z.object({
  ack: WatcherAcknowledgeState,
  last_execution: WatcherExecutionState.optional(),
  last_successful_execution: WatcherExecutionState.optional(),
  last_throttle: WatcherThrottleState.optional()
}).meta({ id: 'WatcherActionStatus' })
export type WatcherActionStatus = z.infer<typeof WatcherActionStatus>

export const WatcherActionStatusOptions = z.enum(['success', 'failure', 'simulated', 'throttled']).meta({ id: 'WatcherActionStatusOptions' })
export type WatcherActionStatusOptions = z.infer<typeof WatcherActionStatusOptions>

export const WatcherActions = z.record(IndexName, WatcherActionStatus).meta({ id: 'WatcherActions' })
export type WatcherActions = z.infer<typeof WatcherActions>

export const WatcherActivationState = z.object({
  active: z.boolean(),
  timestamp: DateTime
}).meta({ id: 'WatcherActivationState' })
export type WatcherActivationState = z.infer<typeof WatcherActivationState>

export const WatcherActivationStatus = z.object({
  actions: WatcherActions,
  state: WatcherActivationState,
  version: VersionNumber
}).meta({ id: 'WatcherActivationStatus' })
export type WatcherActivationStatus = z.infer<typeof WatcherActivationStatus>

export const WatcherQuantifier = z.enum(['some', 'all']).meta({ id: 'WatcherQuantifier' })
export type WatcherQuantifier = z.infer<typeof WatcherQuantifier>

export const WatcherArrayCompareOpParams = z.object({
  quantifier: WatcherQuantifier,
  value: FieldValue
}).meta({ id: 'WatcherArrayCompareOpParams' })
export type WatcherArrayCompareOpParams = z.infer<typeof WatcherArrayCompareOpParams>

export const WatcherResponseContentType = z.enum(['json', 'yaml', 'text']).meta({ id: 'WatcherResponseContentType' })
export type WatcherResponseContentType = z.infer<typeof WatcherResponseContentType>

export const WatcherHttpInput = z.object({
  extract: z.array(z.string()).optional(),
  request: WatcherHttpInputRequestDefinition.optional(),
  response_content_type: WatcherResponseContentType.optional()
}).meta({ id: 'WatcherHttpInput' })
export type WatcherHttpInput = z.infer<typeof WatcherHttpInput>

export const WatcherSearchInput = z.object({
  extract: z.array(z.string()).optional(),
  request: WatcherSearchInputRequestDefinition,
  timeout: Duration.optional()
}).meta({ id: 'WatcherSearchInput' })
export type WatcherSearchInput = z.infer<typeof WatcherSearchInput>

const WatcherInputContainerExclusiveProps = z.union([z.object({ chain: z.lazy(() => WatcherChainInput) }), z.object({ http: WatcherHttpInput }), z.object({ search: WatcherSearchInput }), z.object({ simple: z.record(z.string(), z.any()) })])

export interface WatcherInputContainerShape {
  chain?: WatcherChainInput | undefined
  http?: WatcherHttpInput | undefined
  search?: WatcherSearchInput | undefined
  simple?: Record<string, unknown> | undefined
}
export const WatcherInputContainer: z.ZodType<WatcherInputContainerShape> = WatcherInputContainerExclusiveProps.meta({ id: 'WatcherInputContainer' })
export type WatcherInputContainer = z.infer<typeof WatcherInputContainer>

export interface WatcherChainInputShape {
  inputs: Array<Record<string, WatcherInputContainerShape>>
}
export const WatcherChainInput = z.object({
  get inputs (): z.ZodArray<z.ZodRecord<z.ZodString, typeof WatcherInputContainer>> { return z.array(z.record(z.string(), WatcherInputContainer)) }
}).meta({ id: 'WatcherChainInput' })
export type WatcherChainInput = z.infer<typeof WatcherChainInput>

export const WatcherConditionType = z.enum(['always', 'never', 'script', 'compare', 'array_compare']).meta({ id: 'WatcherConditionType' })
export type WatcherConditionType = z.infer<typeof WatcherConditionType>

export const WatcherDailySchedule = z.object({
  at: z.array(WatcherScheduleTimeOfDay)
}).meta({ id: 'WatcherDailySchedule' })
export type WatcherDailySchedule = z.infer<typeof WatcherDailySchedule>

export const WatcherDay = z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).meta({ id: 'WatcherDay' })
export type WatcherDay = z.infer<typeof WatcherDay>

export const WatcherEmailResult = z.object({
  account: z.string().optional(),
  message: WatcherEmail,
  reason: z.string().optional()
}).meta({ id: 'WatcherEmailResult' })
export type WatcherEmailResult = z.infer<typeof WatcherEmailResult>

export const WatcherExecutionPhase = z.enum(['awaits_execution', 'started', 'input', 'condition', 'actions', 'watch_transform', 'aborted', 'finished']).meta({ id: 'WatcherExecutionPhase' })
export type WatcherExecutionPhase = z.infer<typeof WatcherExecutionPhase>

export const WatcherIndexResultSummary = z.object({
  created: z.boolean(),
  id: Id,
  index: IndexName,
  result: Result,
  version: VersionNumber
}).meta({ id: 'WatcherIndexResultSummary' })
export type WatcherIndexResultSummary = z.infer<typeof WatcherIndexResultSummary>

export const WatcherIndexResult = z.object({
  response: WatcherIndexResultSummary
}).meta({ id: 'WatcherIndexResult' })
export type WatcherIndexResult = z.infer<typeof WatcherIndexResult>

export const WatcherLoggingResult = z.object({
  logged_text: z.string()
}).meta({ id: 'WatcherLoggingResult' })
export type WatcherLoggingResult = z.infer<typeof WatcherLoggingResult>

export const WatcherHttpInputRequestResult = z.object({
  ...WatcherHttpInputRequestDefinition.shape
}).meta({ id: 'WatcherHttpInputRequestResult' })
export type WatcherHttpInputRequestResult = z.infer<typeof WatcherHttpInputRequestResult>

export const WatcherHttpInputResponseResult = z.object({
  body: z.string(),
  headers: HttpHeaders,
  status: integer
}).meta({ id: 'WatcherHttpInputResponseResult' })
export type WatcherHttpInputResponseResult = z.infer<typeof WatcherHttpInputResponseResult>

export const WatcherPagerDutyResult = z.object({
  event: WatcherPagerDutyEvent,
  reason: z.string().optional(),
  request: WatcherHttpInputRequestResult.optional(),
  response: WatcherHttpInputResponseResult.optional()
}).meta({ id: 'WatcherPagerDutyResult' })
export type WatcherPagerDutyResult = z.infer<typeof WatcherPagerDutyResult>

export const WatcherSlackResult = z.object({
  account: z.string().optional(),
  message: WatcherSlackMessage
}).meta({ id: 'WatcherSlackResult' })
export type WatcherSlackResult = z.infer<typeof WatcherSlackResult>

export const WatcherWebhookResult = z.object({
  request: WatcherHttpInputRequestResult,
  response: WatcherHttpInputResponseResult.optional()
}).meta({ id: 'WatcherWebhookResult' })
export type WatcherWebhookResult = z.infer<typeof WatcherWebhookResult>

export const WatcherExecutionResultAction = z.object({
  email: WatcherEmailResult.optional(),
  id: Id,
  index: WatcherIndexResult.optional(),
  logging: WatcherLoggingResult.optional(),
  pagerduty: WatcherPagerDutyResult.optional(),
  reason: z.string().optional(),
  slack: WatcherSlackResult.optional(),
  status: WatcherActionStatusOptions,
  type: WatcherActionType,
  webhook: WatcherWebhookResult.optional(),
  error: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'WatcherExecutionResultAction' })
export type WatcherExecutionResultAction = z.infer<typeof WatcherExecutionResultAction>

export const WatcherExecutionResultCondition = z.object({
  met: z.boolean(),
  status: WatcherActionStatusOptions,
  type: WatcherConditionType
}).meta({ id: 'WatcherExecutionResultCondition' })
export type WatcherExecutionResultCondition = z.infer<typeof WatcherExecutionResultCondition>

export const WatcherInputType = z.enum(['http', 'search', 'simple']).meta({ id: 'WatcherInputType' })
export type WatcherInputType = z.infer<typeof WatcherInputType>

export const WatcherExecutionResultInput = z.object({
  payload: z.record(z.string(), z.any()),
  status: WatcherActionStatusOptions,
  type: WatcherInputType
}).meta({ id: 'WatcherExecutionResultInput' })
export type WatcherExecutionResultInput = z.infer<typeof WatcherExecutionResultInput>

export const WatcherExecutionResult = z.object({
  actions: z.array(WatcherExecutionResultAction),
  condition: WatcherExecutionResultCondition,
  execution_duration: DurationValue,
  execution_time: DateTime,
  input: WatcherExecutionResultInput
}).meta({ id: 'WatcherExecutionResult' })
export type WatcherExecutionResult = z.infer<typeof WatcherExecutionResult>

export const WatcherExecutionStatus = z.enum(['awaits_execution', 'checking', 'execution_not_needed', 'throttled', 'executed', 'failed', 'deleted_while_queued', 'not_executed_already_queued']).meta({ id: 'WatcherExecutionStatus' })
export type WatcherExecutionStatus = z.infer<typeof WatcherExecutionStatus>

export const WatcherExecutionThreadPool = z.object({
  max_size: long.describe('The largest size of the execution thread pool, which indicates the largest number of concurrent running watches.'),
  queue_size: long.describe('The number of watches that were triggered and are currently queued.')
}).meta({ id: 'WatcherExecutionThreadPool' })
export type WatcherExecutionThreadPool = z.infer<typeof WatcherExecutionThreadPool>

export const WatcherHourlySchedule = z.object({
  minute: z.array(integer)
}).meta({ id: 'WatcherHourlySchedule' })
export type WatcherHourlySchedule = z.infer<typeof WatcherHourlySchedule>

export const WatcherMonth = z.enum(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']).meta({ id: 'WatcherMonth' })
export type WatcherMonth = z.infer<typeof WatcherMonth>

export const WatcherWatchStatus = z.object({
  actions: WatcherActions,
  last_checked: DateTime.optional(),
  last_met_condition: DateTime.optional(),
  state: WatcherActivationState,
  version: VersionNumber,
  execution_state: z.string().optional()
}).meta({ id: 'WatcherWatchStatus' })
export type WatcherWatchStatus = z.infer<typeof WatcherWatchStatus>

export const WatcherTimeOfMonth = z.object({
  at: z.array(z.string()),
  on: z.array(integer)
}).meta({ id: 'WatcherTimeOfMonth' })
export type WatcherTimeOfMonth = z.infer<typeof WatcherTimeOfMonth>

export const WatcherTimeOfWeek = z.object({
  at: z.array(z.string()),
  on: z.array(WatcherDay)
}).meta({ id: 'WatcherTimeOfWeek' })
export type WatcherTimeOfWeek = z.infer<typeof WatcherTimeOfWeek>

export const WatcherTimeOfYear = z.object({
  at: z.array(z.string()),
  int: z.array(WatcherMonth),
  on: z.array(integer)
}).meta({ id: 'WatcherTimeOfYear' })
export type WatcherTimeOfYear = z.infer<typeof WatcherTimeOfYear>

const WatcherScheduleContainerExclusiveProps = z.union([z.object({ timezone: z.string() }), z.object({ cron: WatcherCronExpression }), z.object({ daily: WatcherDailySchedule }), z.object({ hourly: WatcherHourlySchedule }), z.object({ interval: Duration }), z.object({ monthly: z.union([WatcherTimeOfMonth, z.array(WatcherTimeOfMonth)]) }), z.object({ weekly: z.union([WatcherTimeOfWeek, z.array(WatcherTimeOfWeek)]) }), z.object({ yearly: z.union([WatcherTimeOfYear, z.array(WatcherTimeOfYear)]) })])

export const WatcherScheduleContainer = WatcherScheduleContainerExclusiveProps.meta({ id: 'WatcherScheduleContainer' })
export type WatcherScheduleContainer = z.infer<typeof WatcherScheduleContainer>

const WatcherTriggerContainerExclusiveProps = z.union([z.object({ schedule: WatcherScheduleContainer })])

export const WatcherTriggerContainer = WatcherTriggerContainerExclusiveProps.meta({ id: 'WatcherTriggerContainer' })
export type WatcherTriggerContainer = z.infer<typeof WatcherTriggerContainer>

export const WatcherWatch = z.object({
  actions: z.record(IndexName, WatcherAction),
  condition: WatcherConditionContainer,
  input: z.lazy(() => WatcherInputContainer),
  metadata: Metadata.optional(),
  status: WatcherWatchStatus.optional(),
  throttle_period: Duration.optional(),
  throttle_period_in_millis: DurationValue.optional(),
  transform: z.lazy(() => TransformContainer).optional(),
  trigger: WatcherTriggerContainer
}).meta({ id: 'WatcherWatch' })
export type WatcherWatch = z.infer<typeof WatcherWatch>

export const WatcherQueryWatch = z.object({
  _id: Id,
  status: WatcherWatchStatus.optional(),
  watch: WatcherWatch.optional(),
  _primary_term: integer.optional(),
  _seq_no: SequenceNumber.optional()
}).meta({ id: 'WatcherQueryWatch' })
export type WatcherQueryWatch = z.infer<typeof WatcherQueryWatch>

export const WatcherScheduleTriggerEvent = z.object({
  scheduled_time: DateTime,
  triggered_time: DateTime.optional()
}).meta({ id: 'WatcherScheduleTriggerEvent' })
export type WatcherScheduleTriggerEvent = z.infer<typeof WatcherScheduleTriggerEvent>

export interface WatcherSimulatedActionsShape {
  actions: string[]
  all: WatcherSimulatedActionsShape
  use_all: boolean
}
export const WatcherSimulatedActions = z.object({
  actions: z.array(z.string()),
  get all () { return WatcherSimulatedActions },
  use_all: z.boolean()
}).meta({ id: 'WatcherSimulatedActions' })
export type WatcherSimulatedActions = z.infer<typeof WatcherSimulatedActions>

const WatcherTriggerEventContainerExclusiveProps = z.union([z.object({ schedule: WatcherScheduleTriggerEvent })])

export const WatcherTriggerEventContainer = WatcherTriggerEventContainerExclusiveProps.meta({ id: 'WatcherTriggerEventContainer' })
export type WatcherTriggerEventContainer = z.infer<typeof WatcherTriggerEventContainer>

export const WatcherTriggerEventResult = z.object({
  manual: WatcherTriggerEventContainer,
  triggered_time: DateTime,
  type: z.string()
}).meta({ id: 'WatcherTriggerEventResult' })
export type WatcherTriggerEventResult = z.infer<typeof WatcherTriggerEventResult>

/**
 * Acknowledge a watch.
 *
 * Acknowledging a watch enables you to manually throttle the execution of the watch's actions.
 *
 * The acknowledgement state of an action is stored in the `status.actions.<id>.ack.state` structure.
 *
 * IMPORTANT: If the specified watch is currently being executed, this API will return an error
 * The reason for this behavior is to prevent overwriting the watch status from a watch execution.
 *
 * Acknowledging an action throttles further executions of that action until its `ack.state` is reset to `awaits_successful_execution`.
 * This happens when the condition of the watch is not met (the condition evaluates to false).
 * To demonstrate how throttling works in practice and how it can be configured for individual actions within a watch, refer to External documentation.
 */
export const WatcherAckWatchRequest = z.object({
  ...RequestBase.shape,
  watch_id: Name.describe('The watch identifier.').meta({ found_in: 'path' }),
  action_id: Names.describe('A comma-separated list of the action identifiers to acknowledge. If you omit this parameter, all of the actions of the watch are acknowledged.').optional().meta({ found_in: 'path' })
}).meta({ id: 'WatcherAckWatchRequest' })
export type WatcherAckWatchRequest = z.infer<typeof WatcherAckWatchRequest>

export const WatcherAckWatchResponse = z.object({
  status: WatcherWatchStatus
}).meta({ id: 'WatcherAckWatchResponse' })
export type WatcherAckWatchResponse = z.infer<typeof WatcherAckWatchResponse>

/**
 * Activate a watch.
 *
 * A watch can be either active or inactive.
 */
export const WatcherActivateWatchRequest = z.object({
  ...RequestBase.shape,
  watch_id: Name.describe('The watch identifier.').meta({ found_in: 'path' })
}).meta({ id: 'WatcherActivateWatchRequest' })
export type WatcherActivateWatchRequest = z.infer<typeof WatcherActivateWatchRequest>

export const WatcherActivateWatchResponse = z.object({
  status: WatcherActivationStatus
}).meta({ id: 'WatcherActivateWatchResponse' })
export type WatcherActivateWatchResponse = z.infer<typeof WatcherActivateWatchResponse>

/**
 * Deactivate a watch.
 *
 * A watch can be either active or inactive.
 */
export const WatcherDeactivateWatchRequest = z.object({
  ...RequestBase.shape,
  watch_id: Name.describe('The watch identifier.').meta({ found_in: 'path' })
}).meta({ id: 'WatcherDeactivateWatchRequest' })
export type WatcherDeactivateWatchRequest = z.infer<typeof WatcherDeactivateWatchRequest>

export const WatcherDeactivateWatchResponse = z.object({
  status: WatcherActivationStatus
}).meta({ id: 'WatcherDeactivateWatchResponse' })
export type WatcherDeactivateWatchResponse = z.infer<typeof WatcherDeactivateWatchResponse>

/**
 * Delete a watch.
 *
 * When the watch is removed, the document representing the watch in the `.watches` index is gone and it will never be run again.
 *
 * Deleting a watch does not delete any watch execution records related to this watch from the watch history.
 *
 * IMPORTANT: Deleting a watch must be done by using only this API.
 * Do not delete the watch directly from the `.watches` index using the Elasticsearch delete document API
 * When Elasticsearch security features are enabled, make sure no write privileges are granted to anyone for the `.watches` index.
 */
export const WatcherDeleteWatchRequest = z.object({
  ...RequestBase.shape,
  id: Name.describe('The watch identifier.').meta({ found_in: 'path' })
}).meta({ id: 'WatcherDeleteWatchRequest' })
export type WatcherDeleteWatchRequest = z.infer<typeof WatcherDeleteWatchRequest>

export const WatcherDeleteWatchResponse = z.object({
  found: z.boolean(),
  _id: Id,
  _version: VersionNumber
}).meta({ id: 'WatcherDeleteWatchResponse' })
export type WatcherDeleteWatchResponse = z.infer<typeof WatcherDeleteWatchResponse>

/**
 * Run a watch.
 *
 * This API can be used to force execution of the watch outside of its triggering logic or to simulate the watch execution for debugging purposes.
 *
 * For testing and debugging purposes, you also have fine-grained control on how the watch runs.
 * You can run the watch without running all of its actions or alternatively by simulating them.
 * You can also force execution by ignoring the watch condition and control whether a watch record would be written to the watch history after it runs.
 *
 * You can use the run watch API to run watches that are not yet registered by specifying the watch definition inline.
 * This serves as great tool for testing and debugging your watches prior to adding them to Watcher.
 *
 * When Elasticsearch security features are enabled on your cluster, watches are run with the privileges of the user that stored the watches.
 * If your user is allowed to read index `a`, but not index `b`, then the exact same set of rules will apply during execution of a watch.
 *
 * When using the run watch API, the authorization data of the user that called the API will be used as a base, instead of the information who stored the watch.
 * Refer to the external documentation for examples of watch execution requests, including existing, customized, and inline watches.
 */
export const WatcherExecuteWatchRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The watch identifier.').optional().meta({ found_in: 'path' }),
  debug: z.boolean().describe('Defines whether the watch runs in debug mode.').optional().meta({ found_in: 'query' }),
  action_modes: z.record(z.string(), WatcherActionExecutionMode).describe('Determines how to handle the watch actions as part of the watch execution.').optional().meta({ found_in: 'body' }),
  alternative_input: z.record(z.string(), z.any()).describe('When present, the watch uses this object as a payload instead of executing its own input.').optional().meta({ found_in: 'body' }),
  ignore_condition: z.boolean().describe('When set to `true`, the watch execution uses the always condition. This can also be specified as an HTTP parameter.').optional().meta({ found_in: 'body' }),
  record_execution: z.boolean().describe('When set to `true`, the watch record representing the watch execution result is persisted to the `.watcher-history` index for the current time. In addition, the status of the watch is updated, possibly throttling subsequent runs. This can also be specified as an HTTP parameter.').optional().meta({ found_in: 'body' }),
  simulated_actions: z.lazy(() => WatcherSimulatedActions).optional().meta({ found_in: 'body' }),
  trigger_data: WatcherScheduleTriggerEvent.describe('This structure is parsed as the data of the trigger event that will be used during the watch execution.').optional().meta({ found_in: 'body' }),
  watch: WatcherWatch.describe('When present, this watch is used instead of the one specified in the request. This watch is not persisted to the index and `record_execution` cannot be set.').optional().meta({ found_in: 'body' })
}).meta({ id: 'WatcherExecuteWatchRequest' })
export type WatcherExecuteWatchRequest = z.infer<typeof WatcherExecuteWatchRequest>

export const WatcherExecuteWatchWatchRecord = z.object({
  condition: WatcherConditionContainer,
  input: z.lazy(() => WatcherInputContainer),
  messages: z.array(z.string()),
  metadata: Metadata.optional(),
  node: z.string(),
  result: WatcherExecutionResult,
  state: WatcherExecutionStatus,
  trigger_event: WatcherTriggerEventResult,
  user: Username,
  watch_id: Id,
  status: WatcherWatchStatus.optional()
}).meta({ id: 'WatcherExecuteWatchWatchRecord' })
export type WatcherExecuteWatchWatchRecord = z.infer<typeof WatcherExecuteWatchWatchRecord>

export const WatcherExecuteWatchResponse = z.object({
  _id: Id.describe('The watch record identifier as it would be stored in the `.watcher-history` index.'),
  watch_record: WatcherExecuteWatchWatchRecord.describe('The watch record document as it would be stored in the `.watcher-history` index.')
}).meta({ id: 'WatcherExecuteWatchResponse' })
export type WatcherExecuteWatchResponse = z.infer<typeof WatcherExecuteWatchResponse>

/**
 * Get Watcher index settings.
 *
 * Get settings for the Watcher internal index (`.watches`).
 * Only a subset of settings are shown, for example `index.auto_expand_replicas` and `index.number_of_replicas`.
 */
export const WatcherGetSettingsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'WatcherGetSettingsRequest' })
export type WatcherGetSettingsRequest = z.infer<typeof WatcherGetSettingsRequest>

export const WatcherGetSettingsResponse = z.object({
  index: z.lazy(() => IndicesIndexSettings)
}).meta({ id: 'WatcherGetSettingsResponse' })
export type WatcherGetSettingsResponse = z.infer<typeof WatcherGetSettingsResponse>

/** Get a watch. */
export const WatcherGetWatchRequest = z.object({
  ...RequestBase.shape,
  id: Name.describe('The watch identifier.').meta({ found_in: 'path' })
}).meta({ id: 'WatcherGetWatchRequest' })
export type WatcherGetWatchRequest = z.infer<typeof WatcherGetWatchRequest>

export const WatcherGetWatchResponse = z.object({
  found: z.boolean(),
  _id: Id,
  status: WatcherWatchStatus.optional(),
  watch: WatcherWatch.optional(),
  _primary_term: integer.optional(),
  _seq_no: SequenceNumber.optional(),
  _version: VersionNumber.optional()
}).meta({ id: 'WatcherGetWatchResponse' })
export type WatcherGetWatchResponse = z.infer<typeof WatcherGetWatchResponse>

/**
 * Create or update a watch.
 *
 * When a watch is registered, a new document that represents the watch is added to the `.watches` index and its trigger is immediately registered with the relevant trigger engine.
 * Typically for the `schedule` trigger, the scheduler is the trigger engine.
 *
 * IMPORTANT: You must use Kibana or this API to create a watch.
 * Do not add a watch directly to the `.watches` index by using the Elasticsearch index API.
 * If Elasticsearch security features are enabled, do not give users write privileges on the `.watches` index.
 *
 * When you add a watch you can also define its initial active state by setting the *active* parameter.
 *
 * When Elasticsearch security features are enabled, your watch can index or search only on indices for which the user that stored the watch has privileges.
 * If the user is able to read index `a`, but not index `b`, the same will apply when the watch runs.
 */
export const WatcherPutWatchRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The identifier for the watch.').meta({ found_in: 'path' }),
  active: z.boolean().describe('The initial state of the watch. The default value is `true`, which means the watch is active by default.').optional().meta({ found_in: 'query' }),
  if_primary_term: long.describe('Only update the watch if the last operation that has changed the watch has the specified primary term').optional().meta({ found_in: 'query' }),
  if_seq_no: SequenceNumber.describe('Only update the watch if the last operation that has changed the watch has the specified sequence number').optional().meta({ found_in: 'query' }),
  version: VersionNumber.describe('Explicit version number for concurrency control').optional().meta({ found_in: 'query' }),
  actions: z.record(z.string(), WatcherAction).describe('The list of actions that will be run if the condition matches.').optional().meta({ found_in: 'body' }),
  condition: WatcherConditionContainer.describe('The condition that defines if the actions should be run.').optional().meta({ found_in: 'body' }),
  input: z.lazy(() => WatcherInputContainer).describe('The input that defines the input that loads the data for the watch.').optional().meta({ found_in: 'body' }),
  metadata: Metadata.describe('Metadata JSON that will be copied into the history entries.').optional().meta({ found_in: 'body' }),
  throttle_period: Duration.describe('The minimum time between actions being run. The default is 5 seconds. This default can be changed in the config file with the setting `xpack.watcher.throttle.period.default_period`. If both this value and the `throttle_period_in_millis` parameter are specified, Watcher uses the last parameter included in the request.').optional().meta({ found_in: 'body' }),
  throttle_period_in_millis: DurationValue.describe('Minimum time in milliseconds between actions being run. Defaults to 5000. If both this value and the throttle_period parameter are specified, Watcher uses the last parameter included in the request.').optional().meta({ found_in: 'body' }),
  transform: z.lazy(() => TransformContainer).describe('The transform that processes the watch payload to prepare it for the watch actions.').optional().meta({ found_in: 'body' }),
  trigger: WatcherTriggerContainer.describe('The trigger that defines when the watch should run.').optional().meta({ found_in: 'body' })
}).meta({ id: 'WatcherPutWatchRequest' })
export type WatcherPutWatchRequest = z.infer<typeof WatcherPutWatchRequest>

export const WatcherPutWatchResponse = z.object({
  created: z.boolean(),
  _id: Id,
  _primary_term: long,
  _seq_no: SequenceNumber,
  _version: VersionNumber
}).meta({ id: 'WatcherPutWatchResponse' })
export type WatcherPutWatchResponse = z.infer<typeof WatcherPutWatchResponse>

/**
 * Query watches.
 *
 * Get all registered watches in a paginated manner and optionally filter watches by a query.
 *
 * Note that only the `_id` and `metadata.*` fields are queryable or sortable.
 */
export const WatcherQueryWatchesRequest = z.object({
  ...RequestBase.shape,
  from: integer.describe('The offset from the first result to fetch. It must be non-negative.').optional().meta({ found_in: 'body' }),
  size: integer.describe('The number of hits to return. It must be non-negative.').optional().meta({ found_in: 'body' }),
  query: z.lazy(() => QueryDslQueryContainer).describe('A query that filters the watches to be returned.').optional().meta({ found_in: 'body' }),
  sort: z.lazy(() => Sort).describe('One or more fields used to sort the search results.').optional().meta({ found_in: 'body' }),
  search_after: SortResults.describe('Retrieve the next page of hits using a set of sort values from the previous page.').optional().meta({ found_in: 'body' })
}).meta({ id: 'WatcherQueryWatchesRequest' })
export type WatcherQueryWatchesRequest = z.infer<typeof WatcherQueryWatchesRequest>

export const WatcherQueryWatchesResponse = z.object({
  count: integer.describe('The total number of watches found.'),
  watches: z.array(WatcherQueryWatch).describe('A list of watches based on the `from`, `size`, or `search_after` request body parameters.')
}).meta({ id: 'WatcherQueryWatchesResponse' })
export type WatcherQueryWatchesResponse = z.infer<typeof WatcherQueryWatchesResponse>

/**
 * Start the watch service.
 *
 * Start the Watcher service if it is not already running.
 */
export const WatcherStartRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('Period to wait for a connection to the master node.').optional().meta({ found_in: 'query' })
}).meta({ id: 'WatcherStartRequest' })
export type WatcherStartRequest = z.infer<typeof WatcherStartRequest>

export const WatcherStartResponse = AcknowledgedResponseBase.meta({ id: 'WatcherStartResponse' })
export type WatcherStartResponse = z.infer<typeof WatcherStartResponse>

export const WatcherStatsWatcherMetric = z.enum(['_all', 'all', 'queued_watches', 'current_watches', 'pending_watches']).meta({ id: 'WatcherStatsWatcherMetric' })
export type WatcherStatsWatcherMetric = z.infer<typeof WatcherStatsWatcherMetric>

/**
 * Get Watcher statistics.
 *
 * This API always returns basic metrics.
 * You retrieve more metrics by using the metric parameter.
 */
export const WatcherStatsRequest = z.object({
  ...RequestBase.shape,
  metric: z.union([WatcherStatsWatcherMetric, z.array(WatcherStatsWatcherMetric)]).describe('Defines which additional metrics are included in the response.').optional().meta({ found_in: 'path' }),
  emit_stacktraces: z.boolean().describe('Defines whether stack traces are generated for each watch that is running.').optional().meta({ found_in: 'query' })
}).meta({ id: 'WatcherStatsRequest' })
export type WatcherStatsRequest = z.infer<typeof WatcherStatsRequest>

export const WatcherStatsWatchRecordQueuedStats = z.object({
  execution_time: DateTime.describe('The time the watch was run. This is just before the input is being run.')
}).meta({ id: 'WatcherStatsWatchRecordQueuedStats' })
export type WatcherStatsWatchRecordQueuedStats = z.infer<typeof WatcherStatsWatchRecordQueuedStats>

export const WatcherStatsWatchRecordStats = z.object({
  ...WatcherStatsWatchRecordQueuedStats.shape,
  execution_phase: WatcherExecutionPhase.describe('The current watch execution phase.'),
  triggered_time: DateTime.describe('The time the watch was triggered by the trigger engine.'),
  executed_actions: z.array(z.string()).optional(),
  watch_id: Id,
  watch_record_id: Id.describe('The watch record identifier.')
}).meta({ id: 'WatcherStatsWatchRecordStats' })
export type WatcherStatsWatchRecordStats = z.infer<typeof WatcherStatsWatchRecordStats>

export const WatcherStatsWatcherState = z.enum(['stopped', 'starting', 'started', 'stopping']).meta({ id: 'WatcherStatsWatcherState' })
export type WatcherStatsWatcherState = z.infer<typeof WatcherStatsWatcherState>

export const WatcherStatsWatcherNodeStats = z.object({
  current_watches: z.array(WatcherStatsWatchRecordStats).describe('The current executing watches metric gives insight into the watches that are currently being executed by Watcher. Additional information is shared per watch that is currently executing. This information includes the `watch_id`, the time its execution started and its current execution phase. To include this metric, the `metric` option should be set to `current_watches` or `_all`. In addition you can also specify the `emit_stacktraces=true` parameter, which adds stack traces for each watch that is being run. These stack traces can give you more insight into an execution of a watch.').optional(),
  execution_thread_pool: WatcherExecutionThreadPool,
  queued_watches: z.array(WatcherStatsWatchRecordQueuedStats).describe('Watcher moderates the execution of watches such that their execution won\'t put too much pressure on the node and its resources. If too many watches trigger concurrently and there isn\'t enough capacity to run them all, some of the watches are queued, waiting for the current running watches to finish.s The queued watches metric gives insight on these queued watches. To include this metric, the `metric` option should include `queued_watches` or `_all`.').optional(),
  watch_count: long.describe('The number of watches currently registered.'),
  watcher_state: WatcherStatsWatcherState.describe('The current state of Watcher.'),
  node_id: Id
}).meta({ id: 'WatcherStatsWatcherNodeStats' })
export type WatcherStatsWatcherNodeStats = z.infer<typeof WatcherStatsWatcherNodeStats>

export const WatcherStatsResponse = z.object({
  node_stats: NodeStatistics,
  cluster_name: Name,
  manually_stopped: z.boolean(),
  stats: z.array(WatcherStatsWatcherNodeStats)
}).meta({ id: 'WatcherStatsResponse' })
export type WatcherStatsResponse = z.infer<typeof WatcherStatsResponse>

/**
 * Stop the watch service.
 *
 * Stop the Watcher service if it is running.
 */
export const WatcherStopRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for the master node. If the master node is not available before the timeout expires, the request fails and returns an error. To indicate that the request should never timeout, set it to `-1`.').optional().meta({ found_in: 'query' })
}).meta({ id: 'WatcherStopRequest' })
export type WatcherStopRequest = z.infer<typeof WatcherStopRequest>

export const WatcherStopResponse = AcknowledgedResponseBase.meta({ id: 'WatcherStopResponse' })
export type WatcherStopResponse = z.infer<typeof WatcherStopResponse>

/**
 * Update Watcher index settings.
 *
 * Update settings for the Watcher internal index (`.watches`).
 * Only a subset of settings can be modified.
 * This includes `index.auto_expand_replicas`, `index.number_of_replicas`, `index.routing.allocation.exclude.*`,
 * `index.routing.allocation.include.*` and `index.routing.allocation.require.*`.
 * Modification of `index.routing.allocation.include._tier_preference` is an exception and is not allowed as the
 * Watcher shards must always be in the `data_content` tier.
 */
export const WatcherUpdateSettingsRequest = z.object({
  ...RequestBase.shape,
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  'index.auto_expand_replicas': z.string().optional(),
  'index.number_of_replicas': integer.optional()
}).meta({ id: 'WatcherUpdateSettingsRequest' })
export type WatcherUpdateSettingsRequest = z.infer<typeof WatcherUpdateSettingsRequest>

export const WatcherUpdateSettingsResponse = z.object({
  acknowledged: z.boolean()
}).meta({ id: 'WatcherUpdateSettingsResponse' })
export type WatcherUpdateSettingsResponse = z.infer<typeof WatcherUpdateSettingsResponse>
