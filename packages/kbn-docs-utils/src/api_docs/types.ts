/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface AnchorLink {
  /**
   * The plugin that contains the API being referenced.
   */
  pluginName: string;
  /**
   * It's possible the client and the server both emit an API with
   * the same name so we need scope in here to add uniqueness.
   */
  scope: ApiScope;
  /**
   * The name of the api.
   */
  apiName: string;
}

/**
 * The kinds of typescript types we want to show in the docs. `Unknown` is used if
 * we aren't accounting for a particular type. See {@link getPropertyTypeKind}
 */
export enum TypeKind {
  ClassKind = 'Class',
  FunctionKind = 'Function',
  ObjectKind = 'Object',
  EnumKind = 'Enum',
  InterfaceKind = 'Interface',
  /**
   * Maps to the typescript syntax kind `TypeReferences`. For example,
   * export type FooFn = () => string will be a TypeKind, not a FunctionKind.
   */
  TypeKind = 'Type',
  /**
   * Uncategorized is used if a type is encountered that isn't handled.
   */
  Uncategorized = 'Uncategorized',
  UnknownKind = 'Unknown', // Maps to the unknown typescript type
  AnyKind = 'Any', // Maps to the any typescript type
  StringKind = 'string',
  NumberKind = 'number',
  BooleanKind = 'boolean',
  ArrayKind = 'Array',
  /**
   * This will cover things like string | number, or A & B, for lack of something better to put here.
   */
  CompoundTypeKind = 'CompoundType',
}

export interface ScopeApi {
  setup?: ApiDeclaration;
  start?: ApiDeclaration;
  functions: ApiDeclaration[];
  objects: ApiDeclaration[];
  classes: ApiDeclaration[];
  interfaces: ApiDeclaration[];
  enums: ApiDeclaration[];
  misc: ApiDeclaration[];
}

export interface PluginApi {
  id: string;
  serviceFolders?: readonly string[];
  client: ApiDeclaration[];
  server: ApiDeclaration[];
  common: ApiDeclaration[];
}

/**
 * This is used for displaying code or comments that may contain reference links. For example, a function
 * signature that is `(a: import("src/plugin_b").Bar) => void` will be parsed into the following Array:
 *
 * ```ts
 * [
 *   '(a: ',
 *   { docId: 'pluginB', section: 'Bar', text: 'Bar' },
 *   ') => void'
 * ]
 * ```
 *
 * This is then used to render text with nested DocLinks so it looks like this:
 *
 * `(a: => <DocLink docId="pluginB" section="Bar" text="Bar"/>) => void`
 */
export type TextWithLinks = Array<string | Reference>;

/**
 * The information neccessary to build a DocLink.
 */
export interface Reference {
  pluginId: string;
  scope: ApiScope;
  docId: string;
  section?: string;
  text: string;
}

/**
 * This type should eventually be replaced by something inside elastic-docs.
 * It's what will be passed to an elastic-docs supplied component to make
 * the API docs pretty.
 */
export interface ApiDeclaration {
  /**
   * Used for an anchor link to this Api. Can't use label as there can be two labels with the same
   * text within the Client section and the Server section.
   */
  id: string;

  /**
   * The name of the api.
   */
  label: string;

  /**
   * Should the list be expanded or collapsed initially?
   */
  initialIsOpen?: boolean;

  /**
   * The kind of type this API represents, e.g. string, number, Object, Interface, Class.
   */
  type: TypeKind;

  /**
   * Certain types have children. For instance classes have class members, functions will list
   * their parameters here, classes will list their class members here, and objects and interfaces
   * will list their properties.
   */
  children?: ApiDeclaration[];

  /**
   * TODO
   */
  isRequired?: boolean;

  /**
   * Api node comment.
   */
  description?: TextWithLinks;

  /**
   * If the type is a function, it's signature should be displayed. Currently this overlaps with type
   * sometimes, and will sometimes be left empty for large types (like classes and interfaces).
   */
  signature?: TextWithLinks;

  /**
   * Relevant for functions with @returns comments.
   */
  returnComment?: TextWithLinks;

  /**
   * Will contain the tags on a comment, like `beta` or `deprecated`.
   * Won't include param or returns tags.
   */
  tags?: string[];

  /**
   * Every plugin that exposes functionality from their setup and start contract
   * should have a single exported type for each. These get pulled to the top because
   * they are accessed differently than other exported functionality and types.
   */
  lifecycle?: Lifecycle;

  /**
   * Used to create links to github to view the code for this API.
   */
  source: SourceLink;

  /**
   * Other plugins that reference this API item (along with SourceLink info for each reference).
   */
  references?: ApiReference[];

  /**
   * The id of the plugin this API belongs to.
   */
  parentPluginId: string;

  /**
   * Certain deprecated APIs may specify a removeBy date.
   */
  removeBy?: string;

  /**
   * Is this API deprecated or not?
   */
  deprecated?: boolean;
}

export interface SourceLink {
  path: string;
  lineNumber: number;
}

/**
 * Developers will need to know whether these APIs are available on the client, server, or both.
 */
export enum ApiScope {
  CLIENT = 'public',
  SERVER = 'server',
  COMMON = 'common',
}

/**
 * Start and Setup interfaces are special - their functionality is not imported statically but
 * accessible via the dependent plugins start and setup functions.
 */
export enum Lifecycle {
  START = 'start',
  SETUP = 'setup',
}

// Mapping of plugin id to the missing source API id to all the plugin API items that referenced this item.
export interface MissingApiItemMap {
  [key: string]: { [key: string]: string[] };
}

export interface ApiReference {
  plugin: string;
  link: SourceLink;
}

export interface ReferencedDeprecations {
  [key: string]: Array<{ deprecatedApi: ApiDeclaration; ref: ApiReference }>;
}
export interface ApiStats {
  missingComments: ApiDeclaration[];
  isAnyType: ApiDeclaration[];
  noReferences: ApiDeclaration[];
  apiCount: number;
  missingExports: number;
}
