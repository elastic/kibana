/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * --------------- THIS FILE IS COPIED FROM ES SPECIFICATION REPO -------------------
 *
 */

/**
 * The name of a type, composed of a simple name and a namespace. Hierarchical namespace elements are separated by
 * a dot, e.g 'cat.cat_aliases'.
 *
 * Builtin namespaces:
 * - "generic" for type names that are generic parameter values from the enclosing type.
 * - "internal" for primitive and builtin types (e.g. Id, IndexName, etc)
 *    Builtin types:
 *    - boolean,
 *    - string,
 *    - number: a 64bits floating point number. Additional types will be added for integers.
 *    - null: the null value. Since JS distinguishes undefined and null, some APIs make use of this value.
 *    - object: used to represent "any". We may forbid it at some point. UserDefinedValue should be used for user data.
 */
export class TypeName {
  namespace: string;
  name: string;
}

// ------------------------------------------------------------------------------------------------
// Value types

// Note: "required" is part of Property. This means we can have optional properties but we can't have null entries in
// containers (array and dictionary), which doesn't seem to be needed.
//
// The 'kind' property is used to tag and disambiguate union type members, and allow type-safe pattern matching in TS:
// see https://blog.logrocket.com/pattern-matching-and-type-safety-in-typescript-1da1231a2e34/
// and https://medium.com/@fillopeter/pattern-matching-with-typescript-done-right-94049ddd671c

/**
 * Type of a value. Used both for property types and nested type definitions.
 */
export type ValueOf =
  | InstanceOf
  | ArrayOf
  | UnionOf
  | DictionaryOf
  | UserDefinedValue
  | LiteralValue;

/**
 * A single value
 */
export class InstanceOf {
  kind: 'instance_of';
  type: TypeName;
  /** generic parameters: either concrete types or open parameters from the enclosing type */
  generics?: ValueOf[];
}

/**
 * An array
 */
export class ArrayOf {
  kind: 'array_of';
  value: ValueOf;
}

/**
 * One of several possible types which don't necessarily have a common superclass
 */
export class UnionOf {
  kind: 'union_of';
  items: ValueOf[];
}

/**
 * A dictionary (or map).  The key is a string or a number (or a union thereof), possibly through an alias.
 *
 * If `singleKey` is true, then this dictionary can only have a single key. This is a common pattern in ES APIs,
 * used to associate a value to a field name or some other identifier.
 */
export class DictionaryOf {
  kind: 'dictionary_of';
  key: ValueOf;
  value: ValueOf;
  singleKey: boolean;
}

/**
 * A user defined value. To be used when bubbling a generic parameter up to the top-level class is
 * inconvenient or impossible (e.g. for lists of user-defined values of possibly different types).
 *
 * Clients will allow providing a serializer/deserializer when reading/writing properties of this type,
 * and should also accept raw json.
 *
 * Think twice before using this as it defeats the purpose of a strongly typed API, and deserialization
 * will also require to buffer raw JSON data which may have performance implications.
 */
export class UserDefinedValue {
  kind: 'user_defined_value';
}

/**
 * A literal value. This is used for tagged unions, where each type member of a union has a 'type'
 * attribute that defines its kind. This metamodel heavily uses this approach with its 'kind' attributes.
 *
 * It may later be used to set a property to a constant value, which is why it accepts not only strings but also
 * other primitive types.
 */
export class LiteralValue {
  kind: 'literal_value';
  value: string | number | boolean;
}

/**
 * An interface or request interface property.
 */
export class Property {
  name: string;
  type: ValueOf;
  required: boolean;
  description?: string;
  docUrl?: string;
  docId?: string;
  since?: string;
  serverDefault?: boolean | string | number | string[] | number[];
  deprecation?: Deprecation;
  availability?: Availabilities;
  stability?: Stability;
  /**
   * If specified takes precedence over `name` when generating code. `name` is always the value
   * to be sent over the wire
   */
  codegenName?: string;
  /** An optional set of aliases for `name` */
  aliases?: string[];
  /** If the enclosing class is a variants container, is this a property of the container and not a variant? */
  containerProperty?: boolean;
  /** If this property has a quirk that needs special attention, give a short explanation about it */
  esQuirk?: string;
}

// ------------------------------------------------------------------------------------------------
// Type definitions

export type TypeDefinition = Interface | Request | Response | Enum | TypeAlias;

// ------------------------------------------------------------------------------------------------

/**
 * Common attributes for all type definitions
 */
export abstract class BaseType {
  name: TypeName;
  description?: string;
  /** Link to public documentation */
  docUrl?: string;
  docId?: string;
  deprecation?: Deprecation;
  /** If this endpoint has a quirk that needs special attention, give a short explanation about it */
  esQuirk?: string;
  kind: string;
  /** Variant name for externally tagged variants */
  variantName?: string;
  /**
   * Additional identifiers for use by code generators. Usage depends on the actual type:
   * - on unions (modeled as alias(union_of)), these are identifiers for the union members
   * - for additional properties, this is the name of the dict that holds these properties
   * - for additional property, this is the name of the key and value fields that hold the
   *   additional property
   */
  codegenNames?: string[];
  /**
   * Location of an item. The path is relative to the "specification" directory, e.g "_types/common.ts#L1-L2"
   */
  specLocation: string;
}

export type Variants = ExternalTag | InternalTag | Container | Untagged;

export class VariantBase {
  /**
   * Is this variant type open to extensions? Default to false. Used for variants that can
   * be extended with plugins. If true, target clients should allow for additional variants
   * with a variant tag outside the ones defined in the spec and arbitrary data as the value.
   */
  nonExhaustive?: boolean;
}

export class ExternalTag extends VariantBase {
  kind: 'external_tag';
}

export class InternalTag extends VariantBase {
  kind: 'internal_tag';
  /* Name of the property that holds the variant tag */
  tag: string;
  /* Default value for the variant tag if it's missing */
  defaultTag?: string;
}

export class Container extends VariantBase {
  kind: 'container';
}

export class Untagged extends VariantBase {
  kind: 'untagged';
  untypedVariant: TypeName;
}

/**
 * Inherits clause (aka extends or implements) for an interface or request
 */
export class Inherits {
  type: TypeName;
  generics?: ValueOf[];
}

export class Behavior {
  type: TypeName;
  generics?: ValueOf[];
  meta?: Record<string, string>;
}

/**
 * An interface type
 */
export class Interface extends BaseType {
  kind: 'interface';
  /**
   * Open generic parameters. The name is that of the parameter, the namespace is an arbitrary value that allows
   * this fully qualified type name to be used when this open generic parameter is used in property's type.
   */
  generics?: TypeName[];
  inherits?: Inherits;
  implements?: Inherits[];

  /**
   * Behaviors directly implemented by this interface
   */
  behaviors?: Behavior[];

  /**
   * Behaviors attached to this interface, coming from the interface itself (see `behaviors`)
   * or from inherits and implements ancestors
   */
  attachedBehaviors?: string[];
  properties: Property[];
  /**
   * The property that can be used as a shortcut for the entire data structure in the JSON.
   */
  shortcutProperty?: string;

  /** Identify containers */
  variants?: Container;
}

/**
 * A request type
 */
export class Request extends BaseType {
  // Note: does not extend Interface as properties are split across path, query and body
  kind: 'request';
  generics?: TypeName[];
  /** The parent defines additional body properties that are added to the body, that has to be a PropertyBody */
  inherits?: Inherits;
  implements?: Inherits[];
  /** URL path properties */
  path: Property[];
  /** Query string properties */
  query: Property[];
  // FIXME: we need an annotation that lists query params replaced by a body property so that we can skip them.
  // Examples on _search: sort -> sort, _source -> (_source, _source_include, _source_exclude)
  // Or can we say that implicitly a body property replaces all path params starting with its name?
  // Is there a priority rule between path and body parameters?
  //
  // We can also pull path parameter descriptions on body properties they replace

  /**
   * Body type. Most often a list of properties (that can extend those of the inherited class, see above), except for a
   * few specific cases that use other types such as bulk (array) or create (generic parameter). Or NoBody for requests
   * that don't have a body.
   */
  body: Body;
  behaviors?: Behavior[];
  attachedBehaviors?: string[];
}

/**
 * A response type
 */
export class Response extends BaseType {
  kind: 'response';
  generics?: TypeName[];
  body: Body;
  behaviors?: Behavior[];
  attachedBehaviors?: string[];
  exceptions?: ResponseException[];
}

export class ResponseException {
  description?: string;
  body: Body;
  statusCodes: number[];
}

export type Body = ValueBody | PropertiesBody | NoBody;

export class ValueBody {
  kind: 'value';
  value: ValueOf;
  codegenName?: string;
}

export class PropertiesBody {
  kind: 'properties';
  properties: Property[];
}

export class NoBody {
  kind: 'no_body';
}

/**
 * An enumeration member.
 *
 * When enumeration members can become ambiguous when translated to an identifier, the `name` property will be a good
 * identifier name, and `stringValue` will be the string value to use on the wire.
 * See DateMathTimeUnit for an example of this, which have members for "m" (minute) and "M" (month).
 */
export class EnumMember {
  /** The identifier to use for this enum */
  name: string;
  /** An optional set of aliases for `name` */
  aliases?: string[];
  /**
   * If specified takes precedence over `name` when generating code. `name` is always the value
   * to be sent over the wire
   */
  codegenName?: string;
  description?: string;
  deprecation?: Deprecation;
  since?: string;
  availability?: Availabilities;
}

/**
 * An enumeration
 */
export class Enum extends BaseType {
  kind: 'enum';
  /**
   * If the enum is open, it means that other than the specified values it can accept an arbitrary value.
   * If this property is not present, it means that the enum is not open (in other words, is closed).
   */
  isOpen?: boolean;
  members: EnumMember[];
}

/**
 * An alias for an existing type.
 */
export class TypeAlias extends BaseType {
  kind: 'type_alias';
  type: ValueOf;
  /** generic parameters: either concrete types or open parameters from the enclosing type */
  generics?: TypeName[];
  /**
   * Only applicable to `union_of` aliases: identify typed_key unions (external), variant inventories (internal)
   * and untagged variants
   */
  variants?: InternalTag | ExternalTag | Untagged;
}

// ------------------------------------------------------------------------------------------------

export enum Stability {
  stable = 'stable',
  beta = 'beta',
  experimental = 'experimental',
}
export enum Visibility {
  public = 'public',
  feature_flag = 'feature_flag',
  private = 'private',
}

export class Deprecation {
  version: string;
  description: string;
}

export class Availabilities {
  stack?: Availability;
  serverless?: Availability;
}

export class Availability {
  since?: string;
  featureFlag?: string;
  stability?: Stability;
  visibility?: Visibility;
}

export class Endpoint {
  name: string;
  description: string;
  docUrl: string;
  docId?: string;
  deprecation?: Deprecation;
  availability: Availabilities;

  /**
   * If the request value is `null` it means that there is not yet a
   * request type definition for this endpoint.
   */
  request: TypeName | null;
  requestBodyRequired: boolean; // Not sure this is useful

  /**
   * If the response value is `null` it means that there is not yet a
   * response type definition for this endpoint.
   */
  response: TypeName | null;

  urls: UrlTemplate[];

  /**
   * The version when this endpoint reached its current stability level.
   * Missing data means "forever", i.e. before any of the target client versions produced from this spec.
   */
  since?: string;
  stability?: Stability;
  visibility?: Visibility;
  featureFlag?: string;
  requestMediaType?: string[];
  responseMediaType?: string[];
  privileges?: {
    index?: string[];
    cluster?: string[];
  };
}

export class UrlTemplate {
  path: string;
  methods: string[];
  deprecation?: Deprecation;
}

export class Model {
  _info?: {
    title: string;
    license: {
      name: string;
      url: string;
    };
  };

  types: TypeDefinition[];
  endpoints: Endpoint[];
}
