/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Script, ScriptSource } from './_global.search'
import type { ScriptShape, ScriptSourceShape } from './_global.search'
import { SpecUtilsStringified } from './_spec_utils'
import { AcknowledgedResponseBase, DateTime, Duration, DurationValue, EpochTime, ErrorCause, Field, Fields, GeoShapeRelation, GrokPattern, Id, Ids, IndexName, Metadata, Name, RequestBase, ScriptLanguage, SortOrder, VersionNumber, VersionType, double, integer, long } from './_types'

export const IngestShapeType = z.enum(['geo_shape', 'shape']).meta({ id: 'IngestShapeType' })
export type IngestShapeType = z.infer<typeof IngestShapeType>

export const IngestConvertType = z.enum(['integer', 'long', 'double', 'float', 'boolean', 'ip', 'string', 'auto']).meta({ id: 'IngestConvertType' })
export type IngestConvertType = z.infer<typeof IngestConvertType>

export const IngestFingerprintDigest = z.enum(['MD5', 'SHA-1', 'SHA-256', 'SHA-512', 'MurmurHash3']).meta({ id: 'IngestFingerprintDigest' })
export type IngestFingerprintDigest = z.infer<typeof IngestFingerprintDigest>

export const IngestGeoGridTileType = z.enum(['geotile', 'geohex', 'geohash']).meta({ id: 'IngestGeoGridTileType' })
export type IngestGeoGridTileType = z.infer<typeof IngestGeoGridTileType>

export const IngestGeoGridTargetFormat = z.enum(['geojson', 'wkt']).meta({ id: 'IngestGeoGridTargetFormat' })
export type IngestGeoGridTargetFormat = z.infer<typeof IngestGeoGridTargetFormat>

export const IngestInferenceConfigRegression = z.object({
  results_field: Field.describe('The field that is added to incoming documents to contain the inference prediction.').optional(),
  num_top_feature_importance_values: integer.describe('Specifies the maximum number of feature importance values per document.').optional()
}).meta({ id: 'IngestInferenceConfigRegression' })
export type IngestInferenceConfigRegression = z.infer<typeof IngestInferenceConfigRegression>

export const IngestInferenceConfigClassification = z.object({
  num_top_classes: integer.describe('Specifies the number of top class predictions to return.').optional(),
  num_top_feature_importance_values: integer.describe('Specifies the maximum number of feature importance values per document.').optional(),
  results_field: Field.describe('The field that is added to incoming documents to contain the inference prediction.').optional(),
  top_classes_results_field: Field.describe('Specifies the field to which the top classes are written.').optional(),
  prediction_field_type: z.string().describe('Specifies the type of the predicted field to write. Valid values are: `string`, `number`, `boolean`.').optional()
}).meta({ id: 'IngestInferenceConfigClassification' })
export type IngestInferenceConfigClassification = z.infer<typeof IngestInferenceConfigClassification>

const IngestInferenceConfigExclusiveProps = z.union([z.object({ regression: IngestInferenceConfigRegression }), z.object({ classification: IngestInferenceConfigClassification })])

export const IngestInferenceConfig = IngestInferenceConfigExclusiveProps.meta({ id: 'IngestInferenceConfig' })
export type IngestInferenceConfig = z.infer<typeof IngestInferenceConfig>

export const IngestInputConfig = z.object({
  input_field: z.string(),
  output_field: z.string()
}).meta({ id: 'IngestInputConfig' })
export type IngestInputConfig = z.infer<typeof IngestInputConfig>

export const IngestJsonProcessorConflictStrategy = z.enum(['replace', 'merge']).meta({ id: 'IngestJsonProcessorConflictStrategy' })
export type IngestJsonProcessorConflictStrategy = z.infer<typeof IngestJsonProcessorConflictStrategy>

export const IngestUserAgentProperty = z.enum(['name', 'os', 'device', 'original', 'version']).meta({ id: 'IngestUserAgentProperty' })
export type IngestUserAgentProperty = z.infer<typeof IngestUserAgentProperty>

const IngestProcessorContainerExclusiveProps = z.union([z.object({ append: z.lazy(() => IngestAppendProcessor) }), z.object({ attachment: z.lazy(() => IngestAttachmentProcessor) }), z.object({ bytes: z.lazy(() => IngestBytesProcessor) }), z.object({ cef: z.lazy(() => IngestCefProcessor) }), z.object({ circle: z.lazy(() => IngestCircleProcessor) }), z.object({ community_id: z.lazy(() => IngestCommunityIDProcessor) }), z.object({ convert: z.lazy(() => IngestConvertProcessor) }), z.object({ csv: z.lazy(() => IngestCsvProcessor) }), z.object({ date: z.lazy(() => IngestDateProcessor) }), z.object({ date_index_name: z.lazy(() => IngestDateIndexNameProcessor) }), z.object({ dissect: z.lazy(() => IngestDissectProcessor) }), z.object({ dot_expander: z.lazy(() => IngestDotExpanderProcessor) }), z.object({ drop: z.lazy(() => IngestDropProcessor) }), z.object({ enrich: z.lazy(() => IngestEnrichProcessor) }), z.object({ fail: z.lazy(() => IngestFailProcessor) }), z.object({ fingerprint: z.lazy(() => IngestFingerprintProcessor) }), z.object({ foreach: z.lazy(() => IngestForeachProcessor) }), z.object({ ip_location: z.lazy(() => IngestIpLocationProcessor) }), z.object({ geo_grid: z.lazy(() => IngestGeoGridProcessor) }), z.object({ geoip: z.lazy(() => IngestGeoIpProcessor) }), z.object({ grok: z.lazy(() => IngestGrokProcessor) }), z.object({ gsub: z.lazy(() => IngestGsubProcessor) }), z.object({ html_strip: z.lazy(() => IngestHtmlStripProcessor) }), z.object({ inference: z.lazy(() => IngestInferenceProcessor) }), z.object({ join: z.lazy(() => IngestJoinProcessor) }), z.object({ json: z.lazy(() => IngestJsonProcessor) }), z.object({ kv: z.lazy(() => IngestKeyValueProcessor) }), z.object({ lowercase: z.lazy(() => IngestLowercaseProcessor) }), z.object({ network_direction: z.lazy(() => IngestNetworkDirectionProcessor) }), z.object({ pipeline: z.lazy(() => IngestPipelineProcessor) }), z.object({ redact: z.lazy(() => IngestRedactProcessor) }), z.object({ registered_domain: z.lazy(() => IngestRegisteredDomainProcessor) }), z.object({ remove: z.lazy(() => IngestRemoveProcessor) }), z.object({ rename: z.lazy(() => IngestRenameProcessor) }), z.object({ reroute: z.lazy(() => IngestRerouteProcessor) }), z.object({ script: z.lazy(() => IngestScriptProcessor) }), z.object({ set: z.lazy(() => IngestSetProcessor) }), z.object({ set_security_user: z.lazy(() => IngestSetSecurityUserProcessor) }), z.object({ sort: z.lazy(() => IngestSortProcessor) }), z.object({ split: z.lazy(() => IngestSplitProcessor) }), z.object({ terminate: z.lazy(() => IngestTerminateProcessor) }), z.object({ trim: z.lazy(() => IngestTrimProcessor) }), z.object({ uppercase: z.lazy(() => IngestUppercaseProcessor) }), z.object({ urldecode: z.lazy(() => IngestUrlDecodeProcessor) }), z.object({ uri_parts: z.lazy(() => IngestUriPartsProcessor) }), z.object({ user_agent: z.lazy(() => IngestUserAgentProcessor) })])

export interface IngestProcessorContainerShape {
  append?: IngestAppendProcessor | undefined
  attachment?: IngestAttachmentProcessor | undefined
  bytes?: IngestBytesProcessor | undefined
  cef?: IngestCefProcessor | undefined
  circle?: IngestCircleProcessor | undefined
  community_id?: IngestCommunityIDProcessor | undefined
  convert?: IngestConvertProcessor | undefined
  csv?: IngestCsvProcessor | undefined
  date?: IngestDateProcessor | undefined
  date_index_name?: IngestDateIndexNameProcessor | undefined
  dissect?: IngestDissectProcessor | undefined
  dot_expander?: IngestDotExpanderProcessor | undefined
  drop?: IngestDropProcessor | undefined
  enrich?: IngestEnrichProcessor | undefined
  fail?: IngestFailProcessor | undefined
  fingerprint?: IngestFingerprintProcessor | undefined
  foreach?: IngestForeachProcessor | undefined
  ip_location?: IngestIpLocationProcessor | undefined
  geo_grid?: IngestGeoGridProcessor | undefined
  geoip?: IngestGeoIpProcessor | undefined
  grok?: IngestGrokProcessor | undefined
  gsub?: IngestGsubProcessor | undefined
  html_strip?: IngestHtmlStripProcessor | undefined
  inference?: IngestInferenceProcessor | undefined
  join?: IngestJoinProcessor | undefined
  json?: IngestJsonProcessor | undefined
  kv?: IngestKeyValueProcessor | undefined
  lowercase?: IngestLowercaseProcessor | undefined
  network_direction?: IngestNetworkDirectionProcessor | undefined
  pipeline?: IngestPipelineProcessor | undefined
  redact?: IngestRedactProcessor | undefined
  registered_domain?: IngestRegisteredDomainProcessor | undefined
  remove?: IngestRemoveProcessor | undefined
  rename?: IngestRenameProcessor | undefined
  reroute?: IngestRerouteProcessor | undefined
  script?: IngestScriptProcessor | undefined
  set?: IngestSetProcessor | undefined
  set_security_user?: IngestSetSecurityUserProcessor | undefined
  sort?: IngestSortProcessor | undefined
  split?: IngestSplitProcessor | undefined
  terminate?: IngestTerminateProcessor | undefined
  trim?: IngestTrimProcessor | undefined
  uppercase?: IngestUppercaseProcessor | undefined
  urldecode?: IngestUrlDecodeProcessor | undefined
  uri_parts?: IngestUriPartsProcessor | undefined
  user_agent?: IngestUserAgentProcessor | undefined
}
export const IngestProcessorContainer: z.ZodType<IngestProcessorContainerShape> = IngestProcessorContainerExclusiveProps.meta({ id: 'IngestProcessorContainer' })
export type IngestProcessorContainer = z.infer<typeof IngestProcessorContainer>

export interface IngestProcessorBaseShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
}
export const IngestProcessorBase = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional()
}).meta({ id: 'IngestProcessorBase' })
export type IngestProcessorBase = z.infer<typeof IngestProcessorBase>

export interface IngestAppendProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  value?: unknown | unknown[] | undefined
  media_type?: string | undefined
  copy_from?: Field | undefined
  allow_duplicates?: boolean | undefined
  ignore_empty_values?: boolean | undefined
}
export const IngestAppendProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to be appended to. Supports template snippets.'),
  value: z.union([z.any(), z.array(z.any())]).describe('The value to be appended. Supports template snippets. May specify only one of `value` or `copy_from`.').optional(),
  media_type: z.string().describe('The media type for encoding `value`. Applies only when value is a template snippet. Must be one of `application/json`, `text/plain`, or `application/x-www-form-urlencoded`.').optional(),
  copy_from: Field.describe('The origin field which will be appended to `field`, cannot set `value` simultaneously.').optional(),
  allow_duplicates: z.boolean().describe('If `false`, the processor does not append values already present in the field.').optional(),
  ignore_empty_values: z.boolean().describe('If `true`, the processor will skip empty values from the source (e.g. empty strings, and null values), rather than appending them to the field.').optional()
}).meta({ id: 'IngestAppendProcessor' })
export type IngestAppendProcessor = z.infer<typeof IngestAppendProcessor>

export interface IngestAttachmentProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  indexed_chars?: long | undefined
  indexed_chars_field?: Field | undefined
  properties?: string[] | undefined
  target_field?: Field | undefined
  remove_binary?: boolean | undefined
  resource_name?: string | undefined
}
export const IngestAttachmentProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to get the base64 encoded field from.'),
  ignore_missing: z.boolean().describe('If `true` and field does not exist, the processor quietly exits without modifying the document.').optional(),
  indexed_chars: long.describe('The number of chars being used for extraction to prevent huge fields. Use `-1` for no limit.').optional(),
  indexed_chars_field: Field.describe('Field name from which you can overwrite the number of chars being used for extraction.').optional(),
  properties: z.array(z.string()).describe('Array of properties to select to be stored. Can be `content`, `title`, `name`, `author`, `keywords`, `date`, `content_type`, `content_length`, `language`.').optional(),
  target_field: Field.describe('The field that will hold the attachment information.').optional(),
  remove_binary: z.boolean().describe('If true, the binary field will be removed from the document').optional(),
  resource_name: z.string().describe('Field containing the name of the resource to decode. If specified, the processor passes this resource name to the underlying Tika library to enable Resource Name Based Detection.').optional()
}).meta({ id: 'IngestAttachmentProcessor' })
export type IngestAttachmentProcessor = z.infer<typeof IngestAttachmentProcessor>

export interface IngestBytesProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field?: Field | undefined
}
export const IngestBytesProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to convert.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  target_field: Field.describe('The field to assign the converted value to. By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestBytesProcessor' })
export type IngestBytesProcessor = z.infer<typeof IngestBytesProcessor>

export interface IngestCefProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field?: Field | undefined
  ignore_empty_values?: boolean | undefined
  timezone?: string | undefined
}
export const IngestCefProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field containing the CEF message.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  target_field: Field.describe('The field to assign the converted value to. By default, the `target_field` is \'cef\'').optional(),
  ignore_empty_values: z.boolean().describe('If `true` and value is anempty string in extensions, the processor quietly exits without modifying the document.').optional(),
  timezone: z.string().describe('The timezone to use when parsing the date and when date math index supports resolves expressions into concrete index names.').optional()
}).meta({ id: 'IngestCefProcessor' })
export type IngestCefProcessor = z.infer<typeof IngestCefProcessor>

export interface IngestCircleProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  error_distance: double
  field: Field
  ignore_missing?: boolean | undefined
  shape_type: IngestShapeType
  target_field?: Field | undefined
}
export const IngestCircleProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  error_distance: double.describe('The difference between the resulting inscribed distance from center to side and the circle’s radius (measured in meters for `geo_shape`, unit-less for `shape`).'),
  field: Field.describe('The field to interpret as a circle. Either a string in WKT format or a map for GeoJSON.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  shape_type: IngestShapeType.describe('Which field mapping type is to be used when processing the circle: `geo_shape` or `shape`.'),
  target_field: Field.describe('The field to assign the polygon shape to By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestCircleProcessor' })
export type IngestCircleProcessor = z.infer<typeof IngestCircleProcessor>

export interface IngestCommunityIDProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  source_ip?: Field | undefined
  source_port?: Field | undefined
  destination_ip?: Field | undefined
  destination_port?: Field | undefined
  iana_number?: Field | undefined
  icmp_type?: Field | undefined
  icmp_code?: Field | undefined
  transport?: Field | undefined
  target_field?: Field | undefined
  seed?: integer | undefined
  ignore_missing?: boolean | undefined
}
export const IngestCommunityIDProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  source_ip: Field.describe('Field containing the source IP address.').optional(),
  source_port: Field.describe('Field containing the source port.').optional(),
  destination_ip: Field.describe('Field containing the destination IP address.').optional(),
  destination_port: Field.describe('Field containing the destination port.').optional(),
  iana_number: Field.describe('Field containing the IANA number.').optional(),
  icmp_type: Field.describe('Field containing the ICMP type.').optional(),
  icmp_code: Field.describe('Field containing the ICMP code.').optional(),
  transport: Field.describe('Field containing the transport protocol name or number. Used only when the iana_number field is not present. The following protocol names are currently supported: eigrp, gre, icmp, icmpv6, igmp, ipv6-icmp, ospf, pim, sctp, tcp, udp').optional(),
  target_field: Field.describe('Output field for the community ID.').optional(),
  seed: integer.describe('Seed for the community ID hash. Must be between 0 and 65535 (inclusive). The seed can prevent hash collisions between network domains, such as a staging and production network that use the same addressing scheme.').optional(),
  ignore_missing: z.boolean().describe('If true and any required fields are missing, the processor quietly exits without modifying the document.').optional()
}).meta({ id: 'IngestCommunityIDProcessor' })
export type IngestCommunityIDProcessor = z.infer<typeof IngestCommunityIDProcessor>

export interface IngestConvertProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field?: Field | undefined
  type: IngestConvertType
}
export const IngestConvertProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field whose value is to be converted.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  target_field: Field.describe('The field to assign the converted value to. By default, the `field` is updated in-place.').optional(),
  type: IngestConvertType.describe('The type to convert the existing value to.')
}).meta({ id: 'IngestConvertProcessor' })
export type IngestConvertProcessor = z.infer<typeof IngestConvertProcessor>

export interface IngestCsvProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  empty_value?: unknown | undefined
  field: Field
  ignore_missing?: boolean | undefined
  quote?: string | undefined
  separator?: string | undefined
  target_fields: Fields
  trim?: boolean | undefined
}
export const IngestCsvProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  empty_value: z.any().describe('Value used to fill empty fields. Empty fields are skipped if this is not provided. An empty field is one with no value (2 consecutive separators) or empty quotes (`""`).').optional(),
  field: Field.describe('The field to extract data from.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  quote: z.string().describe('Quote used in CSV, has to be single character string.').optional(),
  separator: z.string().describe('Separator used in CSV, has to be single character string.').optional(),
  target_fields: Fields.describe('The array of fields to assign extracted values to.'),
  trim: z.boolean().describe('Trim whitespaces in unquoted fields.').optional()
}).meta({ id: 'IngestCsvProcessor' })
export type IngestCsvProcessor = z.infer<typeof IngestCsvProcessor>

export const IngestMaxmind = z.object({
  account_id: Id
}).meta({ id: 'IngestMaxmind' })
export type IngestMaxmind = z.infer<typeof IngestMaxmind>

export const IngestIpinfo = z.object({
}).meta({ id: 'IngestIpinfo' })
export type IngestIpinfo = z.infer<typeof IngestIpinfo>

const IngestDatabaseConfigurationCommonProps = z.object({
  name: Name.describe('The provider-assigned name of the IP geolocation database to download.')
})

const IngestDatabaseConfigurationExclusiveProps = z.union([z.object({ maxmind: IngestMaxmind }), z.object({ ipinfo: IngestIpinfo })])

/**
 * The configuration necessary to identify which IP geolocation provider to use to download a database, as well as any provider-specific configuration necessary for such downloading.
 * At present, the only supported providers are `maxmind` and `ipinfo`, and the `maxmind` provider requires that an `account_id` (string) is configured.
 * A provider (either `maxmind` or `ipinfo`) must be specified. The web and local providers can be returned as read only configurations.
 */
export const IngestDatabaseConfiguration = IngestDatabaseConfigurationCommonProps.and(IngestDatabaseConfigurationExclusiveProps).meta({ id: 'IngestDatabaseConfiguration' })
export type IngestDatabaseConfiguration = z.infer<typeof IngestDatabaseConfiguration>

export const IngestWeb = z.object({
}).meta({ id: 'IngestWeb' })
export type IngestWeb = z.infer<typeof IngestWeb>

export const IngestLocal = z.object({
  type: z.string()
}).meta({ id: 'IngestLocal' })
export type IngestLocal = z.infer<typeof IngestLocal>

const IngestDatabaseConfigurationFullCommonProps = z.object({
  name: Name.describe('The provider-assigned name of the IP geolocation database to download.')
})

const IngestDatabaseConfigurationFullExclusiveProps = z.union([z.object({ web: IngestWeb }), z.object({ local: IngestLocal }), z.object({ maxmind: IngestMaxmind }), z.object({ ipinfo: IngestIpinfo })])

export const IngestDatabaseConfigurationFull = IngestDatabaseConfigurationFullCommonProps.and(IngestDatabaseConfigurationFullExclusiveProps).meta({ id: 'IngestDatabaseConfigurationFull' })
export type IngestDatabaseConfigurationFull = z.infer<typeof IngestDatabaseConfigurationFull>

export interface IngestDateIndexNameProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  date_formats?: string[] | undefined
  date_rounding: string
  field: Field
  index_name_format?: string | undefined
  index_name_prefix?: string | undefined
  locale?: string | undefined
  timezone?: string | undefined
}
export const IngestDateIndexNameProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  date_formats: z.array(z.string()).describe('An array of the expected date formats for parsing dates / timestamps in the document being preprocessed. Can be a java time pattern or one of the following formats: ISO8601, UNIX, UNIX_MS, or TAI64N.').optional(),
  date_rounding: z.string().describe('How to round the date when formatting the date into the index name. Valid values are: `y` (year), `M` (month), `w` (week), `d` (day), `h` (hour), `m` (minute) and `s` (second). Supports template snippets.'),
  field: Field.describe('The field to get the date or timestamp from.'),
  index_name_format: z.string().describe('The format to be used when printing the parsed date into the index name. A valid java time pattern is expected here. Supports template snippets.').optional(),
  index_name_prefix: z.string().describe('A prefix of the index name to be prepended before the printed date. Supports template snippets.').optional(),
  locale: z.string().describe('The locale to use when parsing the date from the document being preprocessed, relevant when parsing month names or week days.').optional(),
  timezone: z.string().describe('The timezone to use when parsing the date and when date math index supports resolves expressions into concrete index names.').optional()
}).meta({ id: 'IngestDateIndexNameProcessor' })
export type IngestDateIndexNameProcessor = z.infer<typeof IngestDateIndexNameProcessor>

export interface IngestDateProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  formats: string[]
  locale?: string | undefined
  target_field?: Field | undefined
  timezone?: string | undefined
  output_format?: string | undefined
}
export const IngestDateProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to get the date from.'),
  formats: z.array(z.string()).describe('An array of the expected date formats. Can be a java time pattern or one of the following formats: ISO8601, UNIX, UNIX_MS, or TAI64N.'),
  locale: z.string().describe('The locale to use when parsing the date, relevant when parsing month names or week days. Supports template snippets.').optional(),
  target_field: Field.describe('The field that will hold the parsed date.').optional(),
  timezone: z.string().describe('The timezone to use when parsing the date. Supports template snippets.').optional(),
  output_format: z.string().describe('The format to use when writing the date to target_field. Must be a valid java time pattern.').optional()
}).meta({ id: 'IngestDateProcessor' })
export type IngestDateProcessor = z.infer<typeof IngestDateProcessor>

export interface IngestDissectProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  append_separator?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  pattern: string
}
export const IngestDissectProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  append_separator: z.string().describe('The character(s) that separate the appended fields.').optional(),
  field: Field.describe('The field to dissect.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  pattern: z.string().describe('The pattern to apply to the field.')
}).meta({ id: 'IngestDissectProcessor' })
export type IngestDissectProcessor = z.infer<typeof IngestDissectProcessor>

export const IngestDocument = z.object({
  _id: Id.describe('Unique identifier for the document. This ID must be unique within the `_index`.').optional(),
  _index: IndexName.describe('Name of the index containing the document.').optional(),
  _source: z.any().describe('JSON body for the document.')
}).meta({ id: 'IngestDocument' })
export type IngestDocument = z.infer<typeof IngestDocument>

export const IngestRedact = z.object({
  _is_redacted: z.boolean().describe('indicates if document has been redacted')
}).meta({ id: 'IngestRedact' })
export type IngestRedact = z.infer<typeof IngestRedact>

export const IngestIngest = z.object({
  _redact: IngestRedact.optional(),
  timestamp: DateTime,
  pipeline: Name.optional()
}).meta({ id: 'IngestIngest' })
export type IngestIngest = z.infer<typeof IngestIngest>

/** The simulated document, with optional metadata. */
export const IngestDocumentSimulation = z.object({
  _id: Id.describe('Unique identifier for the document. This ID must be unique within the `_index`.'),
  _index: IndexName.describe('Name of the index containing the document.'),
  _ingest: IngestIngest,
  _routing: z.string().describe('Value used to send the document to a specific primary shard.').optional(),
  _source: z.record(z.string(), z.any()).describe('JSON body for the document.'),
  _version: SpecUtilsStringified.describe('').optional(),
  _version_type: VersionType.optional()
}).catchall(z.any()).meta({ id: 'IngestDocumentSimulation' })
export type IngestDocumentSimulation = z.infer<typeof IngestDocumentSimulation>

export interface IngestDotExpanderProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  override?: boolean | undefined
  path?: string | undefined
}
export const IngestDotExpanderProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to expand into an object field. If set to `*`, all top-level fields will be expanded.'),
  override: z.boolean().describe('Controls the behavior when there is already an existing nested object that conflicts with the expanded field. When `false`, the processor will merge conflicts by combining the old and the new values into an array. When `true`, the value from the expanded field will overwrite the existing value.').optional(),
  path: z.string().describe('The field that contains the field to expand. Only required if the field to expand is part another object field, because the `field` option can only understand leaf fields.').optional()
}).meta({ id: 'IngestDotExpanderProcessor' })
export type IngestDotExpanderProcessor = z.infer<typeof IngestDotExpanderProcessor>

export interface IngestDropProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
}
export const IngestDropProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional()
}).meta({ id: 'IngestDropProcessor' })
export type IngestDropProcessor = z.infer<typeof IngestDropProcessor>

export interface IngestEnrichProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  max_matches?: integer | undefined
  override?: boolean | undefined
  policy_name: string
  shape_relation?: GeoShapeRelation | undefined
  target_field: Field
}
export const IngestEnrichProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field in the input document that matches the policies match_field used to retrieve the enrichment data. Supports template snippets.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  max_matches: integer.describe('The maximum number of matched documents to include under the configured target field. The `target_field` will be turned into a json array if `max_matches` is higher than 1, otherwise `target_field` will become a json object. In order to avoid documents getting too large, the maximum allowed value is 128.').optional(),
  override: z.boolean().describe('If processor will update fields with pre-existing non-null-valued field. When set to `false`, such fields will not be touched.').optional(),
  policy_name: z.string().describe('The name of the enrich policy to use.'),
  shape_relation: GeoShapeRelation.describe('A spatial relation operator used to match the geoshape of incoming documents to documents in the enrich index. This option is only used for `geo_match` enrich policy types.').optional(),
  target_field: Field.describe('Field added to incoming documents to contain enrich data. This field contains both the `match_field` and `enrich_fields` specified in the enrich policy. Supports template snippets.')
}).meta({ id: 'IngestEnrichProcessor' })
export type IngestEnrichProcessor = z.infer<typeof IngestEnrichProcessor>

export interface IngestFailProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  message: string
}
export const IngestFailProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  message: z.string().describe('The error message thrown by the processor. Supports template snippets.')
}).meta({ id: 'IngestFailProcessor' })
export type IngestFailProcessor = z.infer<typeof IngestFailProcessor>

export const IngestFieldAccessPattern = z.enum(['classic', 'flexible']).meta({ id: 'IngestFieldAccessPattern' })
export type IngestFieldAccessPattern = z.infer<typeof IngestFieldAccessPattern>

export interface IngestFingerprintProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  fields: Fields
  target_field?: Field | undefined
  salt?: string | undefined
  method?: IngestFingerprintDigest | undefined
  ignore_missing?: boolean | undefined
}
export const IngestFingerprintProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  fields: Fields.describe('Array of fields to include in the fingerprint. For objects, the processor hashes both the field key and value. For other fields, the processor hashes only the field value.'),
  target_field: Field.describe('Output field for the fingerprint.').optional(),
  salt: z.string().describe('Salt value for the hash function.').optional(),
  method: IngestFingerprintDigest.describe('The hash method used to compute the fingerprint. Must be one of MD5, SHA-1, SHA-256, SHA-512, or MurmurHash3.').optional(),
  ignore_missing: z.boolean().describe('If true, the processor ignores any missing fields. If all fields are missing, the processor silently exits without modifying the document.').optional()
}).meta({ id: 'IngestFingerprintProcessor' })
export type IngestFingerprintProcessor = z.infer<typeof IngestFingerprintProcessor>

export interface IngestForeachProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  processor: IngestProcessorContainerShape
}
export const IngestForeachProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('Field containing array or object values.'),
  ignore_missing: z.boolean().describe('If `true`, the processor silently exits without changing the document if the `field` is `null` or missing.').optional(),
  get processor () { return IngestProcessorContainer.describe('Ingest processor to run on each element.') }
}).meta({ id: 'IngestForeachProcessor' })
export type IngestForeachProcessor = z.infer<typeof IngestForeachProcessor>

export interface IngestGeoGridProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: string
  tile_type: IngestGeoGridTileType
  target_field?: Field | undefined
  parent_field?: Field | undefined
  children_field?: Field | undefined
  non_children_field?: Field | undefined
  precision_field?: Field | undefined
  ignore_missing?: boolean | undefined
  target_format?: IngestGeoGridTargetFormat | undefined
}
export const IngestGeoGridProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: z.string().describe('The field to interpret as a geo-tile.= The field format is determined by the `tile_type`.'),
  tile_type: IngestGeoGridTileType.describe('Three tile formats are understood: geohash, geotile and geohex.'),
  target_field: Field.describe('The field to assign the polygon shape to, by default, the `field` is updated in-place.').optional(),
  parent_field: Field.describe('If specified and a parent tile exists, save that tile address to this field.').optional(),
  children_field: Field.describe('If specified and children tiles exist, save those tile addresses to this field as an array of strings.').optional(),
  non_children_field: Field.describe('If specified and intersecting non-child tiles exist, save their addresses to this field as an array of strings.').optional(),
  precision_field: Field.describe('If specified, save the tile precision (zoom) as an integer to this field.').optional(),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  target_format: IngestGeoGridTargetFormat.describe('Which format to save the generated polygon in.').optional()
}).meta({ id: 'IngestGeoGridProcessor' })
export type IngestGeoGridProcessor = z.infer<typeof IngestGeoGridProcessor>

export interface IngestGeoIpProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  database_file?: string | undefined
  field: Field
  first_only?: boolean | undefined
  ignore_missing?: boolean | undefined
  properties?: string[] | undefined
  target_field?: Field | undefined
  download_database_on_pipeline_creation?: boolean | undefined
}
export const IngestGeoIpProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  database_file: z.string().describe('The database filename referring to a database the module ships with (GeoLite2-City.mmdb, GeoLite2-Country.mmdb, or GeoLite2-ASN.mmdb) or a custom database in the ingest-geoip config directory.').optional(),
  field: Field.describe('The field to get the ip address from for the geographical lookup.'),
  first_only: z.boolean().describe('If `true`, only the first found geoip data will be returned, even if the field contains an array.').optional(),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  properties: z.array(z.string()).describe('Controls what properties are added to the `target_field` based on the geoip lookup.').optional(),
  target_field: Field.describe('The field that will hold the geographical information looked up from the MaxMind database.').optional(),
  download_database_on_pipeline_creation: z.boolean().describe('If `true` (and if `ingest.geoip.downloader.eager.download` is `false`), the missing database is downloaded when the pipeline is created. Else, the download is triggered by when the pipeline is used as the `default_pipeline` or `final_pipeline` in an index.').optional()
}).meta({ id: 'IngestGeoIpProcessor' })
export type IngestGeoIpProcessor = z.infer<typeof IngestGeoIpProcessor>

export interface IngestGrokProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  ecs_compatibility?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  pattern_definitions?: Record<string, string> | undefined
  patterns: GrokPattern[]
  trace_match?: boolean | undefined
  validate_only?: boolean | undefined
}
export const IngestGrokProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  ecs_compatibility: z.string().describe('Must be disabled or v1. If v1, the processor uses patterns with Elastic Common Schema (ECS) field names.').optional(),
  field: Field.describe('The field to use for grok expression parsing.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  pattern_definitions: z.record(z.string(), z.string()).describe('A map of pattern-name and pattern tuples defining custom patterns to be used by the current processor. Patterns matching existing names will override the pre-existing definition.').optional(),
  patterns: z.array(GrokPattern).describe('An ordered list of grok expression to match and extract named captures with. Returns on the first expression in the list that matches.'),
  trace_match: z.boolean().describe('When `true`, `_ingest._grok_match_index` will be inserted into your matched document’s metadata with the index into the pattern found in `patterns` that matched.').optional(),
  validate_only: z.boolean().describe('When `true`, the processor does matching but does not extract structured fields').optional()
}).meta({ id: 'IngestGrokProcessor' })
export type IngestGrokProcessor = z.infer<typeof IngestGrokProcessor>

export interface IngestGsubProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  pattern: string
  replacement: string
  target_field?: Field | undefined
}
export const IngestGsubProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to apply the replacement to.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  pattern: z.string().describe('The pattern to be replaced.'),
  replacement: z.string().describe('The string to replace the matching patterns with.'),
  target_field: Field.describe('The field to assign the converted value to By default, the `field` is updated in-place.').optional()
}).meta({ id: 'IngestGsubProcessor' })
export type IngestGsubProcessor = z.infer<typeof IngestGsubProcessor>

export interface IngestHtmlStripProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field?: Field | undefined
}
export const IngestHtmlStripProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The string-valued field to remove HTML tags from.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document,').optional(),
  target_field: Field.describe('The field to assign the converted value to By default, the `field` is updated in-place.').optional()
}).meta({ id: 'IngestHtmlStripProcessor' })
export type IngestHtmlStripProcessor = z.infer<typeof IngestHtmlStripProcessor>

export interface IngestInferenceProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  model_id: Id
  target_field?: Field | undefined
  field_map?: Record<Field, unknown> | undefined
  inference_config?: IngestInferenceConfig | undefined
  input_output?: IngestInputConfig | IngestInputConfig[] | undefined
  ignore_missing?: boolean | undefined
}
export const IngestInferenceProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  model_id: Id.describe('The ID or alias for the trained model, or the ID of the deployment.'),
  target_field: Field.describe('Field added to incoming documents to contain results objects.').optional(),
  field_map: z.record(Field, z.any()).describe('Maps the document field names to the known field names of the model. This mapping takes precedence over any default mappings provided in the model configuration.').optional(),
  inference_config: IngestInferenceConfig.describe('Contains the inference type and its options.').optional(),
  input_output: z.union([IngestInputConfig, z.array(IngestInputConfig)]).describe('Input fields for inference and output (destination) fields for the inference results. This option is incompatible with the target_field and field_map options.').optional(),
  ignore_missing: z.boolean().describe('If true and any of the input fields defined in input_ouput are missing then those missing fields are quietly ignored, otherwise a missing field causes a failure. Only applies when using input_output configurations to explicitly list the input fields.').optional()
}).meta({ id: 'IngestInferenceProcessor' })
export type IngestInferenceProcessor = z.infer<typeof IngestInferenceProcessor>

export interface IngestIpLocationProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  database_file?: string | undefined
  field: Field
  first_only?: boolean | undefined
  ignore_missing?: boolean | undefined
  properties?: string[] | undefined
  target_field?: Field | undefined
  download_database_on_pipeline_creation?: boolean | undefined
}
export const IngestIpLocationProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  database_file: z.string().describe('The database filename referring to a database the module ships with (GeoLite2-City.mmdb, GeoLite2-Country.mmdb, or GeoLite2-ASN.mmdb) or a custom database in the ingest-geoip config directory.').optional(),
  field: Field.describe('The field to get the ip address from for the geographical lookup.'),
  first_only: z.boolean().describe('If `true`, only the first found IP location data will be returned, even if the field contains an array.').optional(),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  properties: z.array(z.string()).describe('Controls what properties are added to the `target_field` based on the IP location lookup.').optional(),
  target_field: Field.describe('The field that will hold the geographical information looked up from the MaxMind database.').optional(),
  download_database_on_pipeline_creation: z.boolean().describe('If `true` (and if `ingest.geoip.downloader.eager.download` is `false`), the missing database is downloaded when the pipeline is created. Else, the download is triggered by when the pipeline is used as the `default_pipeline` or `final_pipeline` in an index.').optional()
}).meta({ id: 'IngestIpLocationProcessor' })
export type IngestIpLocationProcessor = z.infer<typeof IngestIpLocationProcessor>

export interface IngestJoinProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  separator: string
  target_field?: Field | undefined
}
export const IngestJoinProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('Field containing array values to join.'),
  separator: z.string().describe('The separator character.'),
  target_field: Field.describe('The field to assign the joined value to. By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestJoinProcessor' })
export type IngestJoinProcessor = z.infer<typeof IngestJoinProcessor>

export interface IngestJsonProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  add_to_root?: boolean | undefined
  add_to_root_conflict_strategy?: IngestJsonProcessorConflictStrategy | undefined
  allow_duplicate_keys?: boolean | undefined
  field: Field
  target_field?: Field | undefined
}
export const IngestJsonProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  add_to_root: z.boolean().describe('Flag that forces the parsed JSON to be added at the top level of the document. `target_field` must not be set when this option is chosen.').optional(),
  add_to_root_conflict_strategy: IngestJsonProcessorConflictStrategy.describe('When set to `replace`, root fields that conflict with fields from the parsed JSON will be overridden. When set to `merge`, conflicting fields will be merged. Only applicable `if add_to_root` is set to true.').optional(),
  allow_duplicate_keys: z.boolean().describe('When set to `true`, the JSON parser will not fail if the JSON contains duplicate keys. Instead, the last encountered value for any duplicate key wins.').optional(),
  field: Field.describe('The field to be parsed.'),
  target_field: Field.describe('The field that the converted structured object will be written into. Any existing content in this field will be overwritten.').optional()
}).meta({ id: 'IngestJsonProcessor' })
export type IngestJsonProcessor = z.infer<typeof IngestJsonProcessor>

export interface IngestKeyValueProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  exclude_keys?: string[] | undefined
  field: Field
  field_split: string
  ignore_missing?: boolean | undefined
  include_keys?: string[] | undefined
  prefix?: string | undefined
  strip_brackets?: boolean | undefined
  target_field?: Field | undefined
  trim_key?: string | undefined
  trim_value?: string | undefined
  value_split: string
}
export const IngestKeyValueProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  exclude_keys: z.array(z.string()).describe('List of keys to exclude from document.').optional(),
  field: Field.describe('The field to be parsed. Supports template snippets.'),
  field_split: z.string().describe('Regex pattern to use for splitting key-value pairs.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  include_keys: z.array(z.string()).describe('List of keys to filter and insert into document. Defaults to including all keys.').optional(),
  prefix: z.string().describe('Prefix to be added to extracted keys.').optional(),
  strip_brackets: z.boolean().describe('If `true`. strip brackets `()`, `<>`, `[]` as well as quotes `\'` and `"` from extracted values.').optional(),
  target_field: Field.describe('The field to insert the extracted keys into. Defaults to the root of the document. Supports template snippets.').optional(),
  trim_key: z.string().describe('String of characters to trim from extracted keys.').optional(),
  trim_value: z.string().describe('String of characters to trim from extracted values.').optional(),
  value_split: z.string().describe('Regex pattern to use for splitting the key from the value within a key-value pair.')
}).meta({ id: 'IngestKeyValueProcessor' })
export type IngestKeyValueProcessor = z.infer<typeof IngestKeyValueProcessor>

export interface IngestLowercaseProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field?: Field | undefined
}
export const IngestLowercaseProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to make lowercase.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  target_field: Field.describe('The field to assign the converted value to. By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestLowercaseProcessor' })
export type IngestLowercaseProcessor = z.infer<typeof IngestLowercaseProcessor>

export interface IngestNetworkDirectionProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  source_ip?: Field | undefined
  destination_ip?: Field | undefined
  target_field?: Field | undefined
  internal_networks?: string[] | undefined
  internal_networks_field?: Field | undefined
  ignore_missing?: boolean | undefined
}
export const IngestNetworkDirectionProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  source_ip: Field.describe('Field containing the source IP address.').optional(),
  destination_ip: Field.describe('Field containing the destination IP address.').optional(),
  target_field: Field.describe('Output field for the network direction.').optional(),
  internal_networks: z.array(z.string()).describe('List of internal networks. Supports IPv4 and IPv6 addresses and ranges in CIDR notation. Also supports the named ranges listed below. These may be constructed with template snippets. Must specify only one of internal_networks or internal_networks_field.').optional(),
  internal_networks_field: Field.describe('A field on the given document to read the internal_networks configuration from.').optional(),
  ignore_missing: z.boolean().describe('If true and any required fields are missing, the processor quietly exits without modifying the document.').optional()
}).meta({ id: 'IngestNetworkDirectionProcessor' })
export type IngestNetworkDirectionProcessor = z.infer<typeof IngestNetworkDirectionProcessor>

export const IngestPipeline = z.object({
  description: z.string().describe('Description of the ingest pipeline.').optional(),
  on_failure: z.array(z.lazy(() => IngestProcessorContainer)).describe('Processors to run immediately after a processor failure.').optional(),
  processors: z.array(z.lazy(() => IngestProcessorContainer)).describe('Processors used to perform transformations on documents before indexing. Processors run sequentially in the order specified.').optional(),
  version: VersionNumber.describe('Version number used by external systems to track ingest pipelines.').optional(),
  deprecated: z.boolean().describe('Marks this ingest pipeline as deprecated. When a deprecated ingest pipeline is referenced as the default or final pipeline when creating or updating a non-deprecated index template, Elasticsearch will emit a deprecation warning.').optional(),
  _meta: Metadata.describe('Arbitrary metadata about the ingest pipeline. This map is not automatically generated by Elasticsearch.').optional(),
  created_date: DateTime.describe('Date and time when the pipeline was created. Only returned if the `human` query parameter is `true`.').optional(),
  created_date_millis: EpochTime.describe('Date and time when the pipeline was created, in milliseconds since the epoch.').optional(),
  modified_date: DateTime.describe('Date and time when the pipeline was last modified. Only returned if the `human` query parameter is `true`.').optional(),
  modified_date_millis: EpochTime.describe('Date and time when the pipeline was last modified, in milliseconds since the epoch.').optional(),
  field_access_pattern: IngestFieldAccessPattern.describe('Controls how processors in this pipeline should read and write data on a document\'s source.').optional()
}).meta({ id: 'IngestPipeline' })
export type IngestPipeline = z.infer<typeof IngestPipeline>

export const IngestPipelineConfig = z.object({
  description: z.string().describe('Description of the ingest pipeline.').optional(),
  version: VersionNumber.describe('Version number used by external systems to track ingest pipelines.').optional(),
  processors: z.array(z.lazy(() => IngestProcessorContainer)).describe('Processors used to perform transformations on documents before indexing. Processors run sequentially in the order specified.')
}).meta({ id: 'IngestPipelineConfig' })
export type IngestPipelineConfig = z.infer<typeof IngestPipelineConfig>

export interface IngestPipelineProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  name: Name
  ignore_missing_pipeline?: boolean | undefined
}
export const IngestPipelineProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  name: Name.describe('The name of the pipeline to execute. Supports template snippets.'),
  ignore_missing_pipeline: z.boolean().describe('Whether to ignore missing pipelines instead of failing.').optional()
}).meta({ id: 'IngestPipelineProcessor' })
export type IngestPipelineProcessor = z.infer<typeof IngestPipelineProcessor>

export const IngestPipelineSimulationStatusOptions = z.enum(['success', 'error', 'error_ignored', 'skipped', 'dropped']).meta({ id: 'IngestPipelineSimulationStatusOptions' })
export type IngestPipelineSimulationStatusOptions = z.infer<typeof IngestPipelineSimulationStatusOptions>

export const IngestPipelineProcessorResult = z.object({
  doc: IngestDocumentSimulation.optional(),
  tag: z.string().optional(),
  processor_type: z.string().optional(),
  status: IngestPipelineSimulationStatusOptions.optional(),
  description: z.string().optional(),
  ignored_error: z.lazy(() => ErrorCause).optional(),
  error: z.lazy(() => ErrorCause).optional()
}).meta({ id: 'IngestPipelineProcessorResult' })
export type IngestPipelineProcessorResult = z.infer<typeof IngestPipelineProcessorResult>

export interface IngestRedactProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  patterns: GrokPattern[]
  pattern_definitions?: Record<string, string> | undefined
  prefix?: string | undefined
  suffix?: string | undefined
  ignore_missing?: boolean | undefined
  skip_if_unlicensed?: boolean | undefined
  trace_redact?: boolean | undefined
}
export const IngestRedactProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to be redacted'),
  patterns: z.array(GrokPattern).describe('A list of grok expressions to match and redact named captures with'),
  pattern_definitions: z.record(z.string(), z.string()).optional(),
  prefix: z.string().describe('Start a redacted section with this token').optional(),
  suffix: z.string().describe('End a redacted section with this token').optional(),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  skip_if_unlicensed: z.boolean().describe('If `true` and the current license does not support running redact processors, then the processor quietly exits without modifying the document').optional(),
  trace_redact: z.boolean().describe('If `true` then ingest metadata `_ingest._redact._is_redacted` is set to `true` if the document has been redacted').optional()
}).meta({ id: 'IngestRedactProcessor' })
export type IngestRedactProcessor = z.infer<typeof IngestRedactProcessor>

export interface IngestRegisteredDomainProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  target_field?: Field | undefined
  ignore_missing?: boolean | undefined
}
export const IngestRegisteredDomainProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('Field containing the source FQDN.'),
  target_field: Field.describe('Object field containing extracted domain components. If an empty string, the processor adds components to the document’s root.').optional(),
  ignore_missing: z.boolean().describe('If true and any required fields are missing, the processor quietly exits without modifying the document.').optional()
}).meta({ id: 'IngestRegisteredDomainProcessor' })
export type IngestRegisteredDomainProcessor = z.infer<typeof IngestRegisteredDomainProcessor>

export interface IngestRemoveProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Fields
  keep?: Fields | undefined
  ignore_missing?: boolean | undefined
}
export const IngestRemoveProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Fields.describe('Fields to be removed. Supports template snippets.'),
  keep: Fields.describe('Fields to be kept. When set, all fields other than those specified are removed.').optional(),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional()
}).meta({ id: 'IngestRemoveProcessor' })
export type IngestRemoveProcessor = z.infer<typeof IngestRemoveProcessor>

export interface IngestRenameProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field: Field
}
export const IngestRenameProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to be renamed. Supports template snippets.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  target_field: Field.describe('The new name of the field. Supports template snippets.')
}).meta({ id: 'IngestRenameProcessor' })
export type IngestRenameProcessor = z.infer<typeof IngestRenameProcessor>

export interface IngestRerouteProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  destination?: string | undefined
  dataset?: string | string[] | undefined
  namespace?: string | string[] | undefined
}
export const IngestRerouteProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  destination: z.string().describe('A static value for the target. Can’t be set when the dataset or namespace option is set.').optional(),
  dataset: z.union([z.string(), z.array(z.string())]).describe('Field references or a static value for the dataset part of the data stream name. In addition to the criteria for index names, cannot contain - and must be no longer than 100 characters. Example values are nginx.access and nginx.error. Supports field references with a mustache-like syntax (denoted as {{double}} or {{{triple}}} curly braces). When resolving field references, the processor replaces invalid characters with _. Uses the <dataset> part of the index name as a fallback if all field references resolve to a null, missing, or non-string value. default {{data_stream.dataset}}').optional(),
  namespace: z.union([z.string(), z.array(z.string())]).describe('Field references or a static value for the namespace part of the data stream name. See the criteria for index names for allowed characters. Must be no longer than 100 characters. Supports field references with a mustache-like syntax (denoted as {{double}} or {{{triple}}} curly braces). When resolving field references, the processor replaces invalid characters with _. Uses the <namespace> part of the index name as a fallback if all field references resolve to a null, missing, or non-string value. default {{data_stream.namespace}}').optional()
}).meta({ id: 'IngestRerouteProcessor' })
export type IngestRerouteProcessor = z.infer<typeof IngestRerouteProcessor>

export interface IngestScriptProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  id?: Id | undefined
  lang?: ScriptLanguage | undefined
  params?: Record<string, unknown> | undefined
  source?: ScriptSourceShape | undefined
}
export const IngestScriptProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  id: Id.describe('ID of a stored script. If no `source` is specified, this parameter is required.').optional(),
  lang: ScriptLanguage.describe('Script language.').optional(),
  params: z.record(z.string(), z.any()).describe('Object containing parameters for the script.').optional(),
  get source () { return ScriptSource.describe('Inline script. If no `id` is specified, this parameter is required.').optional() }
}).meta({ id: 'IngestScriptProcessor' })
export type IngestScriptProcessor = z.infer<typeof IngestScriptProcessor>

export interface IngestSetProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  copy_from?: Field | undefined
  field: Field
  ignore_empty_value?: boolean | undefined
  media_type?: string | undefined
  override?: boolean | undefined
  value?: unknown | undefined
}
export const IngestSetProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  copy_from: Field.describe('The origin field which will be copied to `field`, cannot set `value` simultaneously. Supported data types are `boolean`, `number`, `array`, `object`, `string`, `date`, etc.').optional(),
  field: Field.describe('The field to insert, upsert, or update. Supports template snippets.'),
  ignore_empty_value: z.boolean().describe('If `true` and `value` is a template snippet that evaluates to `null` or the empty string, the processor quietly exits without modifying the document.').optional(),
  media_type: z.string().describe('The media type for encoding `value`. Applies only when value is a template snippet. Must be one of `application/json`, `text/plain`, or `application/x-www-form-urlencoded`.').optional(),
  override: z.boolean().describe('If `true` processor will update fields with pre-existing non-null-valued field. When set to `false`, such fields will not be touched.').optional(),
  value: z.any().describe('The value to be set for the field. Supports template snippets. May specify only one of `value` or `copy_from`.').optional()
}).meta({ id: 'IngestSetProcessor' })
export type IngestSetProcessor = z.infer<typeof IngestSetProcessor>

export interface IngestSetSecurityUserProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  properties?: string[] | undefined
}
export const IngestSetSecurityUserProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to store the user information into.'),
  properties: z.array(z.string()).describe('Controls what user related properties are added to the field.').optional()
}).meta({ id: 'IngestSetSecurityUserProcessor' })
export type IngestSetSecurityUserProcessor = z.infer<typeof IngestSetSecurityUserProcessor>

export const IngestSimulateDocumentResult = z.object({
  doc: IngestDocumentSimulation.optional(),
  error: z.lazy(() => ErrorCause).optional(),
  processor_results: z.array(IngestPipelineProcessorResult).optional()
}).meta({ id: 'IngestSimulateDocumentResult' })
export type IngestSimulateDocumentResult = z.infer<typeof IngestSimulateDocumentResult>

export interface IngestSortProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  order?: SortOrder | undefined
  target_field?: Field | undefined
}
export const IngestSortProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to be sorted.'),
  order: SortOrder.describe('The sort order to use. Accepts `"asc"` or `"desc"`.').optional(),
  target_field: Field.describe('The field to assign the sorted value to. By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestSortProcessor' })
export type IngestSortProcessor = z.infer<typeof IngestSortProcessor>

export interface IngestSplitProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  preserve_trailing?: boolean | undefined
  separator: string
  target_field?: Field | undefined
}
export const IngestSplitProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to split.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  preserve_trailing: z.boolean().describe('Preserves empty trailing fields, if any.').optional(),
  separator: z.string().describe('A regex which matches the separator, for example, `,` or `s+`.'),
  target_field: Field.describe('The field to assign the split value to. By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestSplitProcessor' })
export type IngestSplitProcessor = z.infer<typeof IngestSplitProcessor>

export interface IngestTerminateProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
}
export const IngestTerminateProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional()
}).meta({ id: 'IngestTerminateProcessor' })
export type IngestTerminateProcessor = z.infer<typeof IngestTerminateProcessor>

export interface IngestTrimProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field?: Field | undefined
}
export const IngestTrimProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The string-valued field to trim whitespace from.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  target_field: Field.describe('The field to assign the trimmed value to. By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestTrimProcessor' })
export type IngestTrimProcessor = z.infer<typeof IngestTrimProcessor>

export interface IngestUppercaseProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field?: Field | undefined
}
export const IngestUppercaseProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to make uppercase.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  target_field: Field.describe('The field to assign the converted value to. By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestUppercaseProcessor' })
export type IngestUppercaseProcessor = z.infer<typeof IngestUppercaseProcessor>

export interface IngestUriPartsProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  keep_original?: boolean | undefined
  remove_if_successful?: boolean | undefined
  target_field?: Field | undefined
}
export const IngestUriPartsProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('Field containing the URI string.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  keep_original: z.boolean().describe('If `true`, the processor copies the unparsed URI to `<target_field>.original`.').optional(),
  remove_if_successful: z.boolean().describe('If `true`, the processor removes the `field` after parsing the URI string. If parsing fails, the processor does not remove the `field`.').optional(),
  target_field: Field.describe('Output field for the URI object.').optional()
}).meta({ id: 'IngestUriPartsProcessor' })
export type IngestUriPartsProcessor = z.infer<typeof IngestUriPartsProcessor>

export interface IngestUrlDecodeProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  target_field?: Field | undefined
}
export const IngestUrlDecodeProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field to decode.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist or is `null`, the processor quietly exits without modifying the document.').optional(),
  target_field: Field.describe('The field to assign the converted value to. By default, the field is updated in-place.').optional()
}).meta({ id: 'IngestUrlDecodeProcessor' })
export type IngestUrlDecodeProcessor = z.infer<typeof IngestUrlDecodeProcessor>

export interface IngestUserAgentProcessorShape {
  description?: string | undefined
  if?: ScriptShape | undefined
  ignore_failure?: boolean | undefined
  on_failure?: IngestProcessorContainerShape[] | undefined
  tag?: string | undefined
  field: Field
  ignore_missing?: boolean | undefined
  regex_file?: string | undefined
  target_field?: Field | undefined
  properties?: IngestUserAgentProperty[] | undefined
  extract_device_type?: boolean | undefined
}
export const IngestUserAgentProcessor = z.object({
  description: z.string().describe('Description of the processor. Useful for describing the purpose of the processor or its configuration.').optional(),
  get if () { return Script.describe('Conditionally execute the processor.').optional() },
  ignore_failure: z.boolean().describe('Ignore failures for the processor.').optional(),
  get on_failure () { return IngestProcessorContainer.array().describe('Handle failures for the processor.').optional() },
  tag: z.string().describe('Identifier for the processor. Useful for debugging and metrics.').optional(),
  field: Field.describe('The field containing the user agent string.'),
  ignore_missing: z.boolean().describe('If `true` and `field` does not exist, the processor quietly exits without modifying the document.').optional(),
  regex_file: z.string().describe('The name of the file in the `config/ingest-user-agent` directory containing the regular expressions for parsing the user agent string. Both the directory and the file have to be created before starting Elasticsearch. If not specified, ingest-user-agent will use the `regexes.yaml` from uap-core it ships with.').optional(),
  target_field: Field.describe('The field that will be filled with the user agent details.').optional(),
  properties: z.array(IngestUserAgentProperty).describe('Controls what properties are added to `target_field`.').optional(),
  extract_device_type: z.boolean().describe('Extracts device type from the user agent string on a best-effort basis.').optional()
}).meta({ id: 'IngestUserAgentProcessor' })
export type IngestUserAgentProcessor = z.infer<typeof IngestUserAgentProcessor>

/**
 * Delete GeoIP database configurations.
 *
 * Delete one or more IP geolocation database configurations.
 */
export const IngestDeleteGeoipDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Ids.describe('A comma-separated list of geoip database configurations to delete').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IngestDeleteGeoipDatabaseRequest' })
export type IngestDeleteGeoipDatabaseRequest = z.infer<typeof IngestDeleteGeoipDatabaseRequest>

export const IngestDeleteGeoipDatabaseResponse = AcknowledgedResponseBase.meta({ id: 'IngestDeleteGeoipDatabaseResponse' })
export type IngestDeleteGeoipDatabaseResponse = z.infer<typeof IngestDeleteGeoipDatabaseResponse>

/** Delete IP geolocation database configurations. */
export const IngestDeleteIpLocationDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Ids.describe('A comma-separated list of IP location database configurations.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. A value of `-1` indicates that the request should never time out.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error. A value of `-1` indicates that the request should never time out.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IngestDeleteIpLocationDatabaseRequest' })
export type IngestDeleteIpLocationDatabaseRequest = z.infer<typeof IngestDeleteIpLocationDatabaseRequest>

export const IngestDeleteIpLocationDatabaseResponse = AcknowledgedResponseBase.meta({ id: 'IngestDeleteIpLocationDatabaseResponse' })
export type IngestDeleteIpLocationDatabaseResponse = z.infer<typeof IngestDeleteIpLocationDatabaseResponse>

/**
 * Delete pipelines.
 *
 * Delete one or more ingest pipelines.
 */
export const IngestDeletePipelineRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Pipeline ID or wildcard expression of pipeline IDs used to limit the request. To delete all ingest pipelines in a cluster, use a value of `*`.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' })
}).meta({ id: 'IngestDeletePipelineRequest' })
export type IngestDeletePipelineRequest = z.infer<typeof IngestDeletePipelineRequest>

export const IngestDeletePipelineResponse = AcknowledgedResponseBase.meta({ id: 'IngestDeletePipelineResponse' })
export type IngestDeletePipelineResponse = z.infer<typeof IngestDeletePipelineResponse>

export const IngestGeoIpStatsGeoIpDownloadStatistics = z.object({
  successful_downloads: integer.describe('Total number of successful database downloads.'),
  failed_downloads: integer.describe('Total number of failed database downloads.'),
  total_download_time: DurationValue.describe('Total milliseconds spent downloading databases.'),
  databases_count: integer.describe('Current number of databases available for use.'),
  skipped_updates: integer.describe('Total number of database updates skipped.'),
  expired_databases: integer.describe('Total number of databases not updated after 30 days')
}).meta({ id: 'IngestGeoIpStatsGeoIpDownloadStatistics' })
export type IngestGeoIpStatsGeoIpDownloadStatistics = z.infer<typeof IngestGeoIpStatsGeoIpDownloadStatistics>

export const IngestGeoIpStatsGeoIpNodeDatabaseName = z.object({
  name: Name.describe('Name of the database.')
}).meta({ id: 'IngestGeoIpStatsGeoIpNodeDatabaseName' })
export type IngestGeoIpStatsGeoIpNodeDatabaseName = z.infer<typeof IngestGeoIpStatsGeoIpNodeDatabaseName>

/** Downloaded databases for the node. The field key is the node ID. */
export const IngestGeoIpStatsGeoIpNodeDatabases = z.object({
  databases: z.array(IngestGeoIpStatsGeoIpNodeDatabaseName).describe('Downloaded databases for the node.'),
  files_in_temp: z.array(z.string()).describe('Downloaded database files, including related license files. Elasticsearch stores these files in the node’s temporary directory: $ES_TMPDIR/geoip-databases/<node_id>.')
}).meta({ id: 'IngestGeoIpStatsGeoIpNodeDatabases' })
export type IngestGeoIpStatsGeoIpNodeDatabases = z.infer<typeof IngestGeoIpStatsGeoIpNodeDatabases>

/**
 * Get GeoIP statistics.
 *
 * Get download statistics for GeoIP2 databases that are used with the GeoIP processor.
 */
export const IngestGeoIpStatsRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'IngestGeoIpStatsRequest' })
export type IngestGeoIpStatsRequest = z.infer<typeof IngestGeoIpStatsRequest>

export const IngestGeoIpStatsResponse = z.object({
  stats: IngestGeoIpStatsGeoIpDownloadStatistics.describe('Download statistics for all GeoIP2 databases.'),
  nodes: z.record(Id, IngestGeoIpStatsGeoIpNodeDatabases).describe('Downloaded GeoIP2 databases for each node.')
}).meta({ id: 'IngestGeoIpStatsResponse' })
export type IngestGeoIpStatsResponse = z.infer<typeof IngestGeoIpStatsResponse>

export const IngestGetGeoipDatabaseDatabaseConfigurationMetadata = z.object({
  id: Id,
  version: long,
  modified_date_millis: EpochTime,
  database: IngestDatabaseConfiguration
}).meta({ id: 'IngestGetGeoipDatabaseDatabaseConfigurationMetadata' })
export type IngestGetGeoipDatabaseDatabaseConfigurationMetadata = z.infer<typeof IngestGetGeoipDatabaseDatabaseConfigurationMetadata>

/**
 * Get GeoIP database configurations.
 *
 * Get information about one or more IP geolocation database configurations.
 */
export const IngestGetGeoipDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Ids.describe('A comma-separated list of database configuration IDs to retrieve. Wildcard (`*`) expressions are supported. To get all database configurations, omit this parameter or use `*`.').optional().meta({ found_in: 'path' })
}).meta({ id: 'IngestGetGeoipDatabaseRequest' })
export type IngestGetGeoipDatabaseRequest = z.infer<typeof IngestGetGeoipDatabaseRequest>

export const IngestGetGeoipDatabaseResponse = z.object({
  databases: z.array(IngestGetGeoipDatabaseDatabaseConfigurationMetadata)
}).meta({ id: 'IngestGetGeoipDatabaseResponse' })
export type IngestGetGeoipDatabaseResponse = z.infer<typeof IngestGetGeoipDatabaseResponse>

export const IngestGetIpLocationDatabaseDatabaseConfigurationMetadata = z.object({
  id: Id,
  version: VersionNumber,
  modified_date_millis: EpochTime.optional(),
  modified_date: EpochTime.optional(),
  database: IngestDatabaseConfigurationFull
}).meta({ id: 'IngestGetIpLocationDatabaseDatabaseConfigurationMetadata' })
export type IngestGetIpLocationDatabaseDatabaseConfigurationMetadata = z.infer<typeof IngestGetIpLocationDatabaseDatabaseConfigurationMetadata>

/** Get IP geolocation database configurations. */
export const IngestGetIpLocationDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Ids.describe('Comma-separated list of database configuration IDs to retrieve. Wildcard (`*`) expressions are supported. To get all database configurations, omit this parameter or use `*`.').optional().meta({ found_in: 'path' })
}).meta({ id: 'IngestGetIpLocationDatabaseRequest' })
export type IngestGetIpLocationDatabaseRequest = z.infer<typeof IngestGetIpLocationDatabaseRequest>

export const IngestGetIpLocationDatabaseResponse = z.object({
  databases: z.array(IngestGetIpLocationDatabaseDatabaseConfigurationMetadata)
}).meta({ id: 'IngestGetIpLocationDatabaseResponse' })
export type IngestGetIpLocationDatabaseResponse = z.infer<typeof IngestGetIpLocationDatabaseResponse>

/**
 * Get pipelines.
 *
 * Get information about one or more ingest pipelines.
 * This API returns a local reference of the pipeline.
 */
export const IngestGetPipelineRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('Comma-separated list of pipeline IDs to retrieve. Wildcard (`*`) expressions are supported. To get all ingest pipelines, omit this parameter or use `*`.').optional().meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  summary: z.boolean().describe('Return pipelines without their definitions').optional().meta({ found_in: 'query' })
}).meta({ id: 'IngestGetPipelineRequest' })
export type IngestGetPipelineRequest = z.infer<typeof IngestGetPipelineRequest>

export const IngestGetPipelineResponse = z.record(z.string(), IngestPipeline).meta({ id: 'IngestGetPipelineResponse' })
export type IngestGetPipelineResponse = z.infer<typeof IngestGetPipelineResponse>

/**
 * Run a grok processor.
 *
 * Extract structured fields out of a single text field within a document.
 * You must choose which field to extract matched fields from, as well as the grok pattern you expect will match.
 * A grok pattern is like a regular expression that supports aliased expressions that can be reused.
 */
export const IngestProcessorGrokRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'IngestProcessorGrokRequest' })
export type IngestProcessorGrokRequest = z.infer<typeof IngestProcessorGrokRequest>

export const IngestProcessorGrokResponse = z.object({
  patterns: z.record(z.string(), z.string())
}).meta({ id: 'IngestProcessorGrokResponse' })
export type IngestProcessorGrokResponse = z.infer<typeof IngestProcessorGrokResponse>

/**
 * Create or update a GeoIP database configuration.
 *
 * Refer to the create or update IP geolocation database configuration API.
 */
export const IngestPutGeoipDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('ID of the database configuration to create or update.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  name: Name.describe('The provider-assigned name of the IP geolocation database to download.').meta({ found_in: 'body' }),
  maxmind: IngestMaxmind.describe('The configuration necessary to identify which IP geolocation provider to use to download the database, as well as any provider-specific configuration necessary for such downloading. At present, the only supported provider is maxmind, and the maxmind provider requires that an account_id (string) is configured.').meta({ found_in: 'body' })
}).meta({ id: 'IngestPutGeoipDatabaseRequest' })
export type IngestPutGeoipDatabaseRequest = z.infer<typeof IngestPutGeoipDatabaseRequest>

export const IngestPutGeoipDatabaseResponse = AcknowledgedResponseBase.meta({ id: 'IngestPutGeoipDatabaseResponse' })
export type IngestPutGeoipDatabaseResponse = z.infer<typeof IngestPutGeoipDatabaseResponse>

/** Create or update an IP geolocation database configuration. */
export const IngestPutIpLocationDatabaseRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The database configuration identifier.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('The period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error. A value of `-1` indicates that the request should never time out.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for a response from all relevant nodes in the cluster after updating the cluster metadata. If no response is received before the timeout expires, the cluster metadata update still applies but the response indicates that it was not completely acknowledged. A value of `-1` indicates that the request should never time out.').optional().meta({ found_in: 'query' }),
  configuration: IngestDatabaseConfiguration.optional().meta({ found_in: 'body' })
}).meta({ id: 'IngestPutIpLocationDatabaseRequest' })
export type IngestPutIpLocationDatabaseRequest = z.infer<typeof IngestPutIpLocationDatabaseRequest>

export const IngestPutIpLocationDatabaseResponse = AcknowledgedResponseBase.meta({ id: 'IngestPutIpLocationDatabaseResponse' })
export type IngestPutIpLocationDatabaseResponse = z.infer<typeof IngestPutIpLocationDatabaseResponse>

/**
 * Create or update a pipeline.
 *
 * Changes made using this API take effect immediately.
 */
export const IngestPutPipelineRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('ID of the ingest pipeline to create or update.').meta({ found_in: 'path' }),
  master_timeout: Duration.describe('Period to wait for a connection to the master node. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('Period to wait for a response. If no response is received before the timeout expires, the request fails and returns an error.').optional().meta({ found_in: 'query' }),
  if_version: integer.describe('Required version for optimistic concurrency control for pipeline updates').optional().meta({ found_in: 'query' }),
  _meta: Metadata.describe('Optional metadata about the ingest pipeline. May have any contents. This map is not automatically generated by Elasticsearch.').optional().meta({ found_in: 'body' }),
  description: z.string().describe('Description of the ingest pipeline.').optional().meta({ found_in: 'body' }),
  on_failure: z.array(z.lazy(() => IngestProcessorContainer)).describe('Processors to run immediately after a processor failure. Each processor supports a processor-level `on_failure` value. If a processor without an `on_failure` value fails, Elasticsearch uses this pipeline-level parameter as a fallback. The processors in this parameter run sequentially in the order specified. Elasticsearch will not attempt to run the pipeline\'s remaining processors.').optional().meta({ found_in: 'body' }),
  processors: z.array(z.lazy(() => IngestProcessorContainer)).describe('Processors used to perform transformations on documents before indexing. Processors run sequentially in the order specified.').optional().meta({ found_in: 'body' }),
  version: VersionNumber.describe('Version number used by external systems to track ingest pipelines. This parameter is intended for external systems only. Elasticsearch does not use or validate pipeline version numbers.').optional().meta({ found_in: 'body' }),
  deprecated: z.boolean().describe('Marks this ingest pipeline as deprecated. When a deprecated ingest pipeline is referenced as the default or final pipeline when creating or updating a non-deprecated index template, Elasticsearch will emit a deprecation warning.').optional().meta({ found_in: 'body' }),
  field_access_pattern: IngestFieldAccessPattern.describe('Controls how processors in this pipeline should read and write data on a document\'s source.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IngestPutPipelineRequest' })
export type IngestPutPipelineRequest = z.infer<typeof IngestPutPipelineRequest>

export const IngestPutPipelineResponse = AcknowledgedResponseBase.meta({ id: 'IngestPutPipelineResponse' })
export type IngestPutPipelineResponse = z.infer<typeof IngestPutPipelineResponse>

/**
 * Simulate a pipeline.
 *
 * Run an ingest pipeline against a set of provided documents.
 * You can either specify an existing pipeline to use with the provided documents or supply a pipeline definition in the body of the request.
 */
export const IngestSimulateRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('The pipeline to test. If you don\'t specify a `pipeline` in the request body, this parameter is required.').optional().meta({ found_in: 'path' }),
  verbose: z.boolean().describe('If `true`, the response includes output data for each processor in the executed pipeline.').optional().meta({ found_in: 'query' }),
  docs: z.array(IngestDocument).describe('Sample documents to test in the pipeline.').meta({ found_in: 'body' }),
  pipeline: IngestPipeline.describe('The pipeline to test. If you don\'t specify the `pipeline` request path parameter, this parameter is required. If you specify both this and the request path parameter, the API only uses the request path parameter.').optional().meta({ found_in: 'body' })
}).meta({ id: 'IngestSimulateRequest' })
export type IngestSimulateRequest = z.infer<typeof IngestSimulateRequest>

export const IngestSimulateResponse = z.object({
  docs: z.array(IngestSimulateDocumentResult)
}).meta({ id: 'IngestSimulateResponse' })
export type IngestSimulateResponse = z.infer<typeof IngestSimulateResponse>
