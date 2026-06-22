/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Bytes, Host, Ip, Name, NodeRoles, TimeUnit, TransportAddress } from './_types'

/**
 * A set of flags that can be represented as a single enum value or a set of values that are encoded
 * as a pipe-separated string
 *
 * Depending on the target language, code generators can use this hint to generate language specific
 * flags enum constructs and the corresponding (de-)serialization code.
 */
export const SpecUtilsPipeSeparatedFlags = z.union([z.any(), z.string()]).meta({ id: 'SpecUtilsPipeSeparatedFlags' })
export type SpecUtilsPipeSeparatedFlags = z.infer<typeof SpecUtilsPipeSeparatedFlags>

export const SpecUtilsBaseNode = z.object({
  attributes: z.record(z.string(), z.string()),
  host: Host,
  ip: Ip,
  name: Name,
  roles: NodeRoles.optional(),
  transport_address: TransportAddress
}).meta({ id: 'SpecUtilsBaseNode' })
export type SpecUtilsBaseNode = z.infer<typeof SpecUtilsBaseNode>

/**
 * A `null` value that is to be interpreted as an actual value, unless other uses of `null` that are equivalent
 * to a missing value. It is used for exemple in settings, where using the `NullValue` for a setting will reset
 * it to its default value.
 */
export const SpecUtilsNullValue = z.null().meta({ id: 'SpecUtilsNullValue' })
export type SpecUtilsNullValue = z.infer<typeof SpecUtilsNullValue>

/**
 * Some APIs will return values such as numbers also as a string (notably epoch timestamps). This behavior
 * is used to capture this behavior while keeping the semantics of the field type.
 *
 * Depending on the target language, code generators can keep the union or remove it and leniently parse
 * strings to the target type.
 */
export const SpecUtilsStringified = z.union([z.any(), z.string()]).meta({ id: 'SpecUtilsStringified' })
export type SpecUtilsStringified = z.infer<typeof SpecUtilsStringified>

/**
 * `WithNullValue<T>` allows for explicit null assignments in contexts where `null` should be interpreted as an
 * actual value.
 */
export const SpecUtilsWithNullValue = z.union([z.any(), SpecUtilsNullValue]).meta({ id: 'SpecUtilsWithNullValue' })
export type SpecUtilsWithNullValue = z.infer<typeof SpecUtilsWithNullValue>

/**
 * In some places in the specification an object consists of the union of a set of known properties
 * and a set of runtime injected properties. Meaning that object should theoretically extend Dictionary but expose
 * a set of known keys and possibly. The object might already be part of an object graph and have a parent class.
 * This puts it into a bind that needs a client specific solution.
 * We therefore document the requirement to behave like a dictionary for unknown properties with this interface.
 */
export const SpecUtilsAdditionalProperties = z.object({
}).meta({ id: 'SpecUtilsAdditionalProperties' })
export type SpecUtilsAdditionalProperties = z.infer<typeof SpecUtilsAdditionalProperties>

/**
 * In some places in the specification an object consists of a static set of properties and a single additional property
 * with an arbitrary name but a statically defined type. This is typically used for configurations associated
 * to a single field. Meaning that object should theoretically extend SingleKeyDictionary but expose
 * a set of known keys. And possibly the object might already be part of an object graph and have a parent class.
 * This puts it into a bind that needs a client specific solution.
 * We therefore document the requirement to accept a single unknown property with this interface.
 */
export const SpecUtilsAdditionalProperty = z.object({
}).meta({ id: 'SpecUtilsAdditionalProperty' })
export type SpecUtilsAdditionalProperty = z.infer<typeof SpecUtilsAdditionalProperty>

/**
 * Implements a set of common query parameters all API's support.
 * Since these can break the request structure these are listed explicitly as a behavior.
 * Its up to individual clients to define support although `error_trace` and `pretty` are
 * recommended as a minimum.
 */
export const SpecUtilsCommonQueryParameters = z.object({
  error_trace: z.boolean().describe('When set to `true` Elasticsearch will include the full stack trace of errors when they occur.').optional(),
  filter_path: z.union([z.string(), z.array(z.string())]).describe('Comma-separated list of filters in dot notation which reduce the response returned by Elasticsearch.').optional(),
  human: z.boolean().describe('When set to `true` will return statistics in a format suitable for humans. For example `"exists_time": "1h"` for humans and `"exists_time_in_millis": 3600000` for computers. When disabled the human readable values will be omitted. This makes sense for responses being consumed only by machines.').optional(),
  pretty: z.boolean().describe('If set to `true` the returned JSON will be "pretty-formatted". Only use this option for debugging only.').optional()
}).meta({ id: 'SpecUtilsCommonQueryParameters' })
export type SpecUtilsCommonQueryParameters = z.infer<typeof SpecUtilsCommonQueryParameters>

/**
 * A class that implements `OverloadOf` only needs to declare properties that differ from the parent.
 * Unchanged properties are inherited automatically. For declared properties, you can change
 * whether a property is required or not as well as its type. Same for the descriptions and js doc tags,
 * if not specified, the parent ones will be used.
 */
export const SpecUtilsOverloadOf = z.object({
}).meta({ id: 'SpecUtilsOverloadOf' })
export type SpecUtilsOverloadOf = z.infer<typeof SpecUtilsOverloadOf>

/**
 * Implements a set of common query parameters all Cat API's support.
 * Since these can break the request structure these are listed explicitly as a behavior.
 */
export const SpecUtilsCommonCatQueryParameters = z.object({
  format: z.string().describe('Specifies the format to return the columnar data in, can be set to `text`, `json`, `cbor`, `yaml`, or `smile`.').optional(),
  help: z.boolean().describe('When set to `true` will output available columns. This option can\'t be combined with any other query string option.').optional(),
  v: z.boolean().describe('When set to `true` will enable verbose output.').optional(),
  bytes: Bytes.describe('Sets the units for columns that contain a byte-size value. Note that byte-size value units work in terms of powers of 1024. For instance `1kb` means 1024 bytes, not 1000 bytes. If omitted, byte-size values are rendered with a suffix such as `kb`, `mb`, or `gb`, chosen such that the numeric value of the column is as small as possible whilst still being at least `1.0`. If given, byte-size values are rendered as an integer with no suffix, representing the value of the column in the chosen unit. Values that are not an exact multiple of the chosen unit are rounded down.').optional(),
  time: TimeUnit.describe('Sets the units for columns that contain a time duration. If omitted, time duration values are rendered with a suffix such as `ms`, `s`, `m` or `h`, chosen such that the numeric value of the column is as small as possible whilst still being at least `1.0`. If given, time duration values are rendered as an integer with no suffix. Values that are not an exact multiple of the chosen unit are rounded down.').optional()
}).meta({ id: 'SpecUtilsCommonCatQueryParameters' })
export type SpecUtilsCommonCatQueryParameters = z.infer<typeof SpecUtilsCommonCatQueryParameters>
