/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, Field, GrokPattern, IndexName, RequestBase, integer, long, uint } from './_types'
import { MappingTypeMapping } from './_types.mapping'
import { IngestPipelineConfig } from './ingest'

export const TextStructureEcsCompatibilityType = z.enum(['disabled', 'v1']).meta({ id: 'TextStructureEcsCompatibilityType' })
export type TextStructureEcsCompatibilityType = z.infer<typeof TextStructureEcsCompatibilityType>

export const TextStructureTopHit = z.object({
  count: long,
  value: z.any()
}).meta({ id: 'TextStructureTopHit' })
export type TextStructureTopHit = z.infer<typeof TextStructureTopHit>

export const TextStructureFieldStat = z.object({
  count: integer,
  cardinality: integer,
  top_hits: z.array(TextStructureTopHit),
  mean_value: integer.optional(),
  median_value: integer.optional(),
  max_value: integer.optional(),
  min_value: integer.optional(),
  earliest: z.string().optional(),
  latest: z.string().optional()
}).meta({ id: 'TextStructureFieldStat' })
export type TextStructureFieldStat = z.infer<typeof TextStructureFieldStat>

export const TextStructureFormatType = z.enum(['delimited', 'ndjson', 'semi_structured_text', 'xml']).meta({ id: 'TextStructureFormatType' })
export type TextStructureFormatType = z.infer<typeof TextStructureFormatType>

/**
 * Find the structure of a text field.
 *
 * Find the structure of a text field in an Elasticsearch index.
 *
 * This API provides a starting point for extracting further information from log messages already ingested into Elasticsearch.
 * For example, if you have ingested data into a very simple index that has just `@timestamp` and message fields, you can use this API to see what common structure exists in the message field.
 *
 * The response from the API contains:
 *
 * * Sample messages.
 * * Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
 * * Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
 * * Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.
 *
 * All this information can be calculated by the structure finder with no guidance.
 * However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.
 *
 * If the structure finder produces unexpected results, specify the `explain` query parameter and an explanation will appear in the response.
 * It helps determine why the returned structure was chosen.
 */
export const TextStructureFindFieldStructureRequest = z.object({
  ...RequestBase.shape,
  column_names: z.union([z.string(), z.array(z.string())]).describe('If `format` is set to `delimited`, you can specify the column names in a comma-separated list. If this parameter is not specified, the structure finder uses the column names from the header row of the text. If the text does not have a header row, columns are named "column1", "column2", "column3", for example.').optional().meta({ found_in: 'query' }),
  delimiter: z.string().describe('If you have set `format` to `delimited`, you can specify the character used to delimit the values in each row. Only a single character is supported; the delimiter cannot have multiple characters. By default, the API considers the following possibilities: comma, tab, semi-colon, and pipe (`|`). In this default scenario, all rows must have the same number of fields for the delimited format to be detected. If you specify a delimiter, up to 10% of the rows can have a different number of columns than the first row.').optional().meta({ found_in: 'query' }),
  documents_to_sample: uint.describe('The number of documents to include in the structural analysis. The minimum value is 2.').optional().meta({ found_in: 'query' }),
  ecs_compatibility: TextStructureEcsCompatibilityType.describe('The mode of compatibility with ECS compliant Grok patterns. Use this parameter to specify whether to use ECS Grok patterns instead of legacy ones when the structure finder creates a Grok pattern. This setting primarily has an impact when a whole message Grok pattern such as `%{CATALINALOG}` matches the input. If the structure finder identifies a common structure but has no idea of the meaning then generic field names such as `path`, `ipaddress`, `field1`, and `field2` are used in the `grok_pattern` output. The intention in that situation is that a user who knows the meanings will rename the fields before using them.').optional().meta({ found_in: 'query' }),
  explain: z.boolean().describe('If `true`, the response includes a field named `explanation`, which is an array of strings that indicate how the structure finder produced its result.').optional().meta({ found_in: 'query' }),
  field: Field.describe('The field that should be analyzed.').meta({ found_in: 'query' }),
  format: TextStructureFormatType.describe('The high level structure of the text. By default, the API chooses the format. In this default scenario, all rows must have the same number of fields for a delimited format to be detected. If the format is set to delimited and the delimiter is not set, however, the API tolerates up to 5% of rows that have a different number of columns than the first row.').optional().meta({ found_in: 'query' }),
  grok_pattern: GrokPattern.describe('If the format is `semi_structured_text`, you can specify a Grok pattern that is used to extract fields from every message in the text. The name of the timestamp field in the Grok pattern must match what is specified in the `timestamp_field` parameter. If that parameter is not specified, the name of the timestamp field in the Grok pattern must match "timestamp". If `grok_pattern` is not specified, the structure finder creates a Grok pattern.').optional().meta({ found_in: 'query' }),
  index: IndexName.describe('The name of the index that contains the analyzed field.').meta({ found_in: 'query' }),
  quote: z.string().describe('If the format is `delimited`, you can specify the character used to quote the values in each row if they contain newlines or the delimiter character. Only a single character is supported. If this parameter is not specified, the default value is a double quote (`"`). If your delimited text format does not use quoting, a workaround is to set this argument to a character that does not appear anywhere in the sample.').optional().meta({ found_in: 'query' }),
  should_trim_fields: z.boolean().describe('If the format is `delimited`, you can specify whether values between delimiters should have whitespace trimmed from them. If this parameter is not specified and the delimiter is pipe (`|`), the default value is true. Otherwise, the default value is `false`.').optional().meta({ found_in: 'query' }),
  should_parse_recursively: z.boolean().describe('If the format is `ndjson`, you can specify whether to parse nested JSON objects recursively. The nested objects are parsed to a maximum depth equal to the default value of the `index.mapping.depth.limit` setting. Anything beyond that depth is parsed as an `object` type field. For formats other than `ndjson`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The maximum amount of time that the structure analysis can take. If the analysis is still running when the timeout expires, it will be stopped.').optional().meta({ found_in: 'query' }),
  timestamp_field: Field.describe('The name of the field that contains the primary timestamp of each record in the text. In particular, if the text was ingested into an index, this is the field that would be used to populate the `@timestamp` field. If the format is `semi_structured_text`, this field must match the name of the appropriate extraction in the `grok_pattern`. Therefore, for semi-structured text, it is best not to specify this parameter unless `grok_pattern` is also specified. For structured text, if you specify this parameter, the field must exist within the text. If this parameter is not specified, the structure finder makes a decision about which field (if any) is the primary timestamp field. For structured text, it is not compulsory to have a timestamp in the text.').optional().meta({ found_in: 'query' }),
  timestamp_format: z.string().describe('The Java time format of the timestamp field in the text. Only a subset of Java time format letter groups are supported: * `a` * `d` * `dd` * `EEE` * `EEEE` * `H` * `HH` * `h` * `M` * `MM` * `MMM` * `MMMM` * `mm` * `ss` * `XX` * `XXX` * `yy` * `yyyy` * `zzz` Additionally `S` letter groups (fractional seconds) of length one to nine are supported providing they occur after `ss` and are separated from the `ss` by a period (`.`), comma (`,`), or colon (`:`). Spacing and punctuation is also permitted with the exception a question mark (`?`), newline, and carriage return, together with literal text enclosed in single quotes. For example, `MM/dd HH.mm.ss,SSSSSS \'in\' yyyy` is a valid override format. One valuable use case for this parameter is when the format is semi-structured text, there are multiple timestamp formats in the text, and you know which format corresponds to the primary timestamp, but you do not want to specify the full `grok_pattern`. Another is when the timestamp format is one that the structure finder does not consider by default. If this parameter is not specified, the structure finder chooses the best format from a built-in set. If the special value `null` is specified, the structure finder will not look for a primary timestamp in the text. When the format is semi-structured text, this will result in the structure finder treating the text as single-line messages.').optional().meta({ found_in: 'query' })
}).meta({ id: 'TextStructureFindFieldStructureRequest' })
export type TextStructureFindFieldStructureRequest = z.infer<typeof TextStructureFindFieldStructureRequest>

export const TextStructureFindFieldStructureResponse = z.object({
  charset: z.string(),
  ecs_compatibility: TextStructureEcsCompatibilityType.optional(),
  field_stats: z.record(Field, TextStructureFieldStat),
  format: TextStructureFormatType,
  grok_pattern: GrokPattern.optional(),
  java_timestamp_formats: z.array(z.string()).optional(),
  joda_timestamp_formats: z.array(z.string()).optional(),
  ingest_pipeline: IngestPipelineConfig,
  mappings: z.lazy(() => MappingTypeMapping),
  multiline_start_pattern: z.string().optional(),
  need_client_timezone: z.boolean(),
  num_lines_analyzed: integer,
  num_messages_analyzed: integer,
  sample_start: z.string(),
  timestamp_field: Field.optional()
}).meta({ id: 'TextStructureFindFieldStructureResponse' })
export type TextStructureFindFieldStructureResponse = z.infer<typeof TextStructureFindFieldStructureResponse>

/**
 * Find the structure of text messages.
 *
 * Find the structure of a list of text messages.
 * The messages must contain data that is suitable to be ingested into Elasticsearch.
 *
 * This API provides a starting point for ingesting data into Elasticsearch in a format that is suitable for subsequent use with other Elastic Stack functionality.
 * Use this API rather than the find text structure API if your input text has already been split up into separate messages by some other process.
 *
 * The response from the API contains:
 *
 * * Sample messages.
 * * Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
 * * Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
 * Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.
 *
 * All this information can be calculated by the structure finder with no guidance.
 * However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.
 *
 * If the structure finder produces unexpected results, specify the `explain` query parameter and an explanation will appear in the response.
 * It helps determine why the returned structure was chosen.
 */
export const TextStructureFindMessageStructureRequest = z.object({
  ...RequestBase.shape,
  column_names: z.union([z.string(), z.array(z.string())]).describe('If the format is `delimited`, you can specify the column names in a comma-separated list. If this parameter is not specified, the structure finder uses the column names from the header row of the text. If the text does not have a header role, columns are named "column1", "column2", "column3", for example.').optional().meta({ found_in: 'query' }),
  delimiter: z.string().describe('If you the format is `delimited`, you can specify the character used to delimit the values in each row. Only a single character is supported; the delimiter cannot have multiple characters. By default, the API considers the following possibilities: comma, tab, semi-colon, and pipe (`|`). In this default scenario, all rows must have the same number of fields for the delimited format to be detected. If you specify a delimiter, up to 10% of the rows can have a different number of columns than the first row.').optional().meta({ found_in: 'query' }),
  ecs_compatibility: TextStructureEcsCompatibilityType.describe('The mode of compatibility with ECS compliant Grok patterns. Use this parameter to specify whether to use ECS Grok patterns instead of legacy ones when the structure finder creates a Grok pattern. This setting primarily has an impact when a whole message Grok pattern such as `%{CATALINALOG}` matches the input. If the structure finder identifies a common structure but has no idea of meaning then generic field names such as `path`, `ipaddress`, `field1`, and `field2` are used in the `grok_pattern` output, with the intention that a user who knows the meanings rename these fields before using it.').optional().meta({ found_in: 'query' }),
  explain: z.boolean().describe('If this parameter is set to true, the response includes a field named `explanation`, which is an array of strings that indicate how the structure finder produced its result.').optional().meta({ found_in: 'query' }),
  format: TextStructureFormatType.describe('The high level structure of the text. By default, the API chooses the format. In this default scenario, all rows must have the same number of fields for a delimited format to be detected. If the format is `delimited` and the delimiter is not set, however, the API tolerates up to 5% of rows that have a different number of columns than the first row.').optional().meta({ found_in: 'query' }),
  grok_pattern: GrokPattern.describe('If the format is `semi_structured_text`, you can specify a Grok pattern that is used to extract fields from every message in the text. The name of the timestamp field in the Grok pattern must match what is specified in the `timestamp_field` parameter. If that parameter is not specified, the name of the timestamp field in the Grok pattern must match "timestamp". If `grok_pattern` is not specified, the structure finder creates a Grok pattern.').optional().meta({ found_in: 'query' }),
  quote: z.string().describe('If the format is `delimited`, you can specify the character used to quote the values in each row if they contain newlines or the delimiter character. Only a single character is supported. If this parameter is not specified, the default value is a double quote (`"`). If your delimited text format does not use quoting, a workaround is to set this argument to a character that does not appear anywhere in the sample.').optional().meta({ found_in: 'query' }),
  should_trim_fields: z.boolean().describe('If the format is `delimited`, you can specify whether values between delimiters should have whitespace trimmed from them. If this parameter is not specified and the delimiter is pipe (`|`), the default value is true. Otherwise, the default value is `false`.').optional().meta({ found_in: 'query' }),
  should_parse_recursively: z.boolean().describe('If the format is `ndjson`, you can specify whether to parse nested JSON objects recursively. The nested objects are parsed to a maximum depth equal to the default value of the `index.mapping.depth.limit` setting. Anything beyond that depth is parsed as an `object` type field. For formats other than `ndjson`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The maximum amount of time that the structure analysis can take. If the analysis is still running when the timeout expires, it will be stopped.').optional().meta({ found_in: 'query' }),
  timestamp_field: Field.describe('The name of the field that contains the primary timestamp of each record in the text. In particular, if the text was ingested into an index, this is the field that would be used to populate the `@timestamp` field. If the format is `semi_structured_text`, this field must match the name of the appropriate extraction in the `grok_pattern`. Therefore, for semi-structured text, it is best not to specify this parameter unless `grok_pattern` is also specified. For structured text, if you specify this parameter, the field must exist within the text. If this parameter is not specified, the structure finder makes a decision about which field (if any) is the primary timestamp field. For structured text, it is not compulsory to have a timestamp in the text.').optional().meta({ found_in: 'query' }),
  timestamp_format: z.string().describe('The Java time format of the timestamp field in the text. Only a subset of Java time format letter groups are supported: * `a` * `d` * `dd` * `EEE` * `EEEE` * `H` * `HH` * `h` * `M` * `MM` * `MMM` * `MMMM` * `mm` * `ss` * `XX` * `XXX` * `yy` * `yyyy` * `zzz` Additionally `S` letter groups (fractional seconds) of length one to nine are supported providing they occur after `ss` and are separated from the `ss` by a period (`.`), comma (`,`), or colon (`:`). Spacing and punctuation is also permitted with the exception a question mark (`?`), newline, and carriage return, together with literal text enclosed in single quotes. For example, `MM/dd HH.mm.ss,SSSSSS \'in\' yyyy` is a valid override format. One valuable use case for this parameter is when the format is semi-structured text, there are multiple timestamp formats in the text, and you know which format corresponds to the primary timestamp, but you do not want to specify the full `grok_pattern`. Another is when the timestamp format is one that the structure finder does not consider by default. If this parameter is not specified, the structure finder chooses the best format from a built-in set. If the special value `null` is specified, the structure finder will not look for a primary timestamp in the text. When the format is semi-structured text, this will result in the structure finder treating the text as single-line messages.').optional().meta({ found_in: 'query' }),
  messages: z.array(z.string()).describe('The list of messages you want to analyze.').meta({ found_in: 'body' })
}).meta({ id: 'TextStructureFindMessageStructureRequest' })
export type TextStructureFindMessageStructureRequest = z.infer<typeof TextStructureFindMessageStructureRequest>

export const TextStructureFindMessageStructureResponse = z.object({
  charset: z.string(),
  ecs_compatibility: TextStructureEcsCompatibilityType.optional(),
  field_stats: z.record(Field, TextStructureFieldStat),
  format: TextStructureFormatType,
  grok_pattern: GrokPattern.optional(),
  java_timestamp_formats: z.array(z.string()).optional(),
  joda_timestamp_formats: z.array(z.string()).optional(),
  ingest_pipeline: IngestPipelineConfig,
  mappings: z.lazy(() => MappingTypeMapping),
  multiline_start_pattern: z.string().optional(),
  need_client_timezone: z.boolean(),
  num_lines_analyzed: integer,
  num_messages_analyzed: integer,
  sample_start: z.string(),
  timestamp_field: Field.optional()
}).meta({ id: 'TextStructureFindMessageStructureResponse' })
export type TextStructureFindMessageStructureResponse = z.infer<typeof TextStructureFindMessageStructureResponse>

export const TextStructureFindStructureFindStructureFormat = z.enum(['ndjson', 'xml', 'delimited', 'semi_structured_text']).meta({ id: 'TextStructureFindStructureFindStructureFormat' })
export type TextStructureFindStructureFindStructureFormat = z.infer<typeof TextStructureFindStructureFindStructureFormat>

/**
 * Find the structure of a text file.
 *
 * The text file must contain data that is suitable to be ingested into Elasticsearch.
 *
 * This API provides a starting point for ingesting data into Elasticsearch in a format that is suitable for subsequent use with other Elastic Stack functionality.
 * Unlike other Elasticsearch endpoints, the data that is posted to this endpoint does not need to be UTF-8 encoded and in JSON format.
 * It must, however, be text; binary text formats are not currently supported.
 * The size is limited to the Elasticsearch HTTP receive buffer size, which defaults to 100 Mb.
 *
 * The response from the API contains:
 *
 * * A couple of messages from the beginning of the text.
 * * Statistics that reveal the most common values for all fields detected within the text and basic numeric statistics for numeric fields.
 * * Information about the structure of the text, which is useful when you write ingest configurations to index it or similarly formatted text.
 * * Appropriate mappings for an Elasticsearch index, which you could use to ingest the text.
 *
 * All this information can be calculated by the structure finder with no guidance.
 * However, you can optionally override some of the decisions about the text structure by specifying one or more query parameters.
 */
export const TextStructureFindStructureRequest = z.object({
  charset: z.string().describe('The text\'s character set. It must be a character set that is supported by the JVM that Elasticsearch uses. For example, `UTF-8`, `UTF-16LE`, `windows-1252`, or `EUC-JP`. If this parameter is not specified, the structure finder chooses an appropriate character set.').optional().meta({ found_in: 'query' }),
  column_names: z.union([z.string(), z.array(z.string())]).describe('If you have set format to `delimited`, you can specify the column names in a comma-separated list. If this parameter is not specified, the structure finder uses the column names from the header row of the text. If the text does not have a header role, columns are named "column1", "column2", "column3", for example.').optional().meta({ found_in: 'query' }),
  delimiter: z.string().describe('If you have set `format` to `delimited`, you can specify the character used to delimit the values in each row. Only a single character is supported; the delimiter cannot have multiple characters. By default, the API considers the following possibilities: comma, tab, semi-colon, and pipe (`|`). In this default scenario, all rows must have the same number of fields for the delimited format to be detected. If you specify a delimiter, up to 10% of the rows can have a different number of columns than the first row.').optional().meta({ found_in: 'query' }),
  ecs_compatibility: z.string().describe('The mode of compatibility with ECS compliant Grok patterns. Use this parameter to specify whether to use ECS Grok patterns instead of legacy ones when the structure finder creates a Grok pattern. Valid values are `disabled` and `v1`. This setting primarily has an impact when a whole message Grok pattern such as `%{CATALINALOG}` matches the input. If the structure finder identifies a common structure but has no idea of meaning then generic field names such as `path`, `ipaddress`, `field1`, and `field2` are used in the `grok_pattern` output, with the intention that a user who knows the meanings rename these fields before using it.').optional().meta({ found_in: 'query' }),
  explain: z.boolean().describe('If this parameter is set to `true`, the response includes a field named explanation, which is an array of strings that indicate how the structure finder produced its result. If the structure finder produces unexpected results for some text, use this query parameter to help you determine why the returned structure was chosen.').optional().meta({ found_in: 'query' }),
  format: TextStructureFindStructureFindStructureFormat.describe('The high level structure of the text. Valid values are `ndjson`, `xml`, `delimited`, and `semi_structured_text`. By default, the API chooses the format. In this default scenario, all rows must have the same number of fields for a delimited format to be detected. If the format is set to `delimited` and the delimiter is not set, however, the API tolerates up to 5% of rows that have a different number of columns than the first row.').optional().meta({ found_in: 'query' }),
  grok_pattern: GrokPattern.describe('If you have set `format` to `semi_structured_text`, you can specify a Grok pattern that is used to extract fields from every message in the text. The name of the timestamp field in the Grok pattern must match what is specified in the `timestamp_field` parameter. If that parameter is not specified, the name of the timestamp field in the Grok pattern must match "timestamp". If `grok_pattern` is not specified, the structure finder creates a Grok pattern.').optional().meta({ found_in: 'query' }),
  has_header_row: z.boolean().describe('If you have set `format` to `delimited`, you can use this parameter to indicate whether the column names are in the first row of the text. If this parameter is not specified, the structure finder guesses based on the similarity of the first row of the text to other rows.').optional().meta({ found_in: 'query' }),
  line_merge_size_limit: uint.describe('The maximum number of characters in a message when lines are merged to form messages while analyzing semi-structured text. If you have extremely long messages you may need to increase this, but be aware that this may lead to very long processing times if the way to group lines into messages is misdetected.').optional().meta({ found_in: 'query' }),
  lines_to_sample: uint.describe('The number of lines to include in the structural analysis, starting from the beginning of the text. The minimum is 2. If the value of this parameter is greater than the number of lines in the text, the analysis proceeds (as long as there are at least two lines in the text) for all of the lines. NOTE: The number of lines and the variation of the lines affects the speed of the analysis. For example, if you upload text where the first 1000 lines are all variations on the same message, the analysis will find more commonality than would be seen with a bigger sample. If possible, however, it is more efficient to upload sample text with more variety in the first 1000 lines than to request analysis of 100000 lines to achieve some variety.').optional().meta({ found_in: 'query' }),
  quote: z.string().describe('If you have set `format` to `delimited`, you can specify the character used to quote the values in each row if they contain newlines or the delimiter character. Only a single character is supported. If this parameter is not specified, the default value is a double quote (`"`). If your delimited text format does not use quoting, a workaround is to set this argument to a character that does not appear anywhere in the sample.').optional().meta({ found_in: 'query' }),
  should_trim_fields: z.boolean().describe('If you have set `format` to `delimited`, you can specify whether values between delimiters should have whitespace trimmed from them. If this parameter is not specified and the delimiter is pipe (`|`), the default value is `true`. Otherwise, the default value is `false`.').optional().meta({ found_in: 'query' }),
  should_parse_recursively: z.boolean().describe('If the format is `ndjson`, you can specify whether to parse nested JSON objects recursively. The nested objects are parsed to a maximum depth equal to the default value of the `index.mapping.depth.limit` setting. Anything beyond that depth is parsed as an `object` type field. For formats other than `ndjson`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The maximum amount of time that the structure analysis can take. If the analysis is still running when the timeout expires then it will be stopped.').optional().meta({ found_in: 'query' }),
  timestamp_field: Field.describe('The name of the field that contains the primary timestamp of each record in the text. In particular, if the text were ingested into an index, this is the field that would be used to populate the `@timestamp` field. If the `format` is `semi_structured_text`, this field must match the name of the appropriate extraction in the `grok_pattern`. Therefore, for semi-structured text, it is best not to specify this parameter unless `grok_pattern` is also specified. For structured text, if you specify this parameter, the field must exist within the text. If this parameter is not specified, the structure finder makes a decision about which field (if any) is the primary timestamp field. For structured text, it is not compulsory to have a timestamp in the text.').optional().meta({ found_in: 'query' }),
  timestamp_format: z.string().describe('The Java time format of the timestamp field in the text. Only a subset of Java time format letter groups are supported: * `a` * `d` * `dd` * `EEE` * `EEEE` * `H` * `HH` * `h` * `M` * `MM` * `MMM` * `MMMM` * `mm` * `ss` * `XX` * `XXX` * `yy` * `yyyy` * `zzz` Additionally `S` letter groups (fractional seconds) of length one to nine are supported providing they occur after `ss` and separated from the `ss` by a `.`, `,` or `:`. Spacing and punctuation is also permitted with the exception of `?`, newline and carriage return, together with literal text enclosed in single quotes. For example, `MM/dd HH.mm.ss,SSSSSS \'in\' yyyy` is a valid override format. One valuable use case for this parameter is when the format is semi-structured text, there are multiple timestamp formats in the text, and you know which format corresponds to the primary timestamp, but you do not want to specify the full `grok_pattern`. Another is when the timestamp format is one that the structure finder does not consider by default. If this parameter is not specified, the structure finder chooses the best format from a built-in set. If the special value `null` is specified the structure finder will not look for a primary timestamp in the text. When the format is semi-structured text this will result in the structure finder treating the text as single-line messages.').optional().meta({ found_in: 'query' }),
  text_files: z.array(z.any()).optional().meta({ found_in: 'body' })
}).meta({ id: 'TextStructureFindStructureRequest' })
export type TextStructureFindStructureRequest = z.infer<typeof TextStructureFindStructureRequest>

export const TextStructureFindStructureResponse = z.object({
  charset: z.string().describe('The character encoding used to parse the text.'),
  has_header_row: z.boolean().optional(),
  has_byte_order_marker: z.boolean().describe('For UTF character encodings, it indicates whether the text begins with a byte order marker.'),
  format: z.string().describe('Valid values include `ndjson`, `xml`, `delimited`, and `semi_structured_text`.'),
  field_stats: z.record(Field, TextStructureFieldStat).describe('The most common values of each field, plus basic numeric statistics for the numeric `page_count` field. This information may provide clues that the data needs to be cleaned or transformed prior to use by other Elastic Stack functionality.'),
  sample_start: z.string().describe('The first two messages in the text verbatim. This may help diagnose parse errors or accidental uploads of the wrong text.'),
  num_messages_analyzed: integer.describe('The number of distinct messages the lines contained. For NDJSON, this value is the same as `num_lines_analyzed`. For other text formats, messages can span several lines.'),
  mappings: z.lazy(() => MappingTypeMapping).describe('Some suitable mappings for an index into which the data could be ingested.'),
  quote: z.string().optional(),
  delimiter: z.string().optional(),
  need_client_timezone: z.boolean().describe('If a timestamp format is detected that does not include a timezone, `need_client_timezone` is `true`. The server that parses the text must therefore be told the correct timezone by the client.'),
  num_lines_analyzed: integer.describe('The number of lines of the text that were analyzed.'),
  column_names: z.array(z.string()).describe('If `format` is `delimited`, the `column_names` field lists the column names in the order they appear in the sample.').optional(),
  explanation: z.array(z.string()).optional(),
  grok_pattern: GrokPattern.optional(),
  multiline_start_pattern: z.string().optional(),
  exclude_lines_pattern: z.string().optional(),
  java_timestamp_formats: z.array(z.string()).describe('The Java time formats recognized in the time fields. Elasticsearch mappings and ingest pipelines use this format.').optional(),
  joda_timestamp_formats: z.array(z.string()).describe('Information that is used to tell Logstash how to parse timestamps.').optional(),
  timestamp_field: Field.describe('The field considered most likely to be the primary timestamp of each document.').optional(),
  should_trim_fields: z.boolean().optional(),
  ingest_pipeline: IngestPipelineConfig
}).meta({ id: 'TextStructureFindStructureResponse' })
export type TextStructureFindStructureResponse = z.infer<typeof TextStructureFindStructureResponse>

export const TextStructureTestGrokPatternMatchedField = z.object({
  match: z.string(),
  offset: integer,
  length: integer
}).meta({ id: 'TextStructureTestGrokPatternMatchedField' })
export type TextStructureTestGrokPatternMatchedField = z.infer<typeof TextStructureTestGrokPatternMatchedField>

export const TextStructureTestGrokPatternMatchedText = z.object({
  matched: z.boolean(),
  fields: z.record(z.string(), z.array(TextStructureTestGrokPatternMatchedField)).optional()
}).meta({ id: 'TextStructureTestGrokPatternMatchedText' })
export type TextStructureTestGrokPatternMatchedText = z.infer<typeof TextStructureTestGrokPatternMatchedText>

/**
 * Test a Grok pattern.
 *
 * Test a Grok pattern on one or more lines of text.
 * The API indicates whether the lines match the pattern together with the offsets and lengths of the matched substrings.
 */
export const TextStructureTestGrokPatternRequest = z.object({
  ...RequestBase.shape,
  ecs_compatibility: z.string().describe('The mode of compatibility with ECS compliant Grok patterns. Use this parameter to specify whether to use ECS Grok patterns instead of legacy ones when the structure finder creates a Grok pattern. Valid values are `disabled` and `v1`.').optional().meta({ found_in: 'query' }),
  grok_pattern: GrokPattern.describe('The Grok pattern to run on the text.').meta({ found_in: 'body' }),
  text: z.array(z.string()).describe('The lines of text to run the Grok pattern on.').meta({ found_in: 'body' })
}).meta({ id: 'TextStructureTestGrokPatternRequest' })
export type TextStructureTestGrokPatternRequest = z.infer<typeof TextStructureTestGrokPatternRequest>

export const TextStructureTestGrokPatternResponse = z.object({
  matches: z.array(TextStructureTestGrokPatternMatchedText)
}).meta({ id: 'TextStructureTestGrokPatternResponse' })
export type TextStructureTestGrokPatternResponse = z.infer<typeof TextStructureTestGrokPatternResponse>
