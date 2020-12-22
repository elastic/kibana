- Start Date: 2020-12-21
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Automatically generate API documentation for every plugin that exposes a public API within Kibana.
This does not cover REST API docs, but is targetted towards our javascript
plugin APIs.

# Screenshots

TODO when I have better screenshots.

# Architecture design

## Hosting

In the short term, the generated docs will reside inside the kibana repo, inside a top level `api_docs` folder. In the long term, we could investigate having the docs system run a script to generated the mdx files, so we don’t need to store them inside the repo.

They will be hosted online wherever the new docs system ends up. This can temporarily be accessed at https://elasticdocstest.netlify.app/docs/.

## Types

The primary types used.

```ts
/**
 * The kinds of typescript types we want to show in the docs. `Unknown` is used if
 * we aren't accounting for a particular type. See {@link getPropertyTypeKind}
 */
export enum TypeKind {
  ClassKind = 'Class',
  FunctionKind = 'Function',
  ObjectKind = 'Object',
  InterfaceKind = 'Interface',
  /**
   * Maps to the typescript syntax kind `TypeReferences`.
   */
  TypeKind = 'Type',
  /**
   * Unknown is used if a type is encountered that isn't handled.
   */
  Unknown = 'Unknown',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'Array',

  /**
   * This will cover things like string | number, or A & B, for lack of something better to put here.
   */
  CompoundType = 'CompoundType',
}

export interface PluginDocDef {
  id: string;
  serviceFolders?: readonly string[];
  public: ApiDocDef[];
  server: ApiDocDef[];
  common: ApiDocDef[];
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
  docId: string;
  section: string;
  text: string;
}

/**
 * This type should eventually be replaced by something inside elastic-docs.
 * It's what will be passed to an elastic-docs supplied component to make
 * the API docs pretty.
 */
export interface ApiDocDef {
  /**
   * Used for an anchor link to this Api. Can't use label as there can be two labels with the same
   * text within the Client section and the Server section.
   */
  id?: string;

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
  children?: ApiDocDef[];

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
   * Every plugn that exposes functionality from their setup and start contract
   * should have a single exported type for each. These get pulled to the top because
   * they are accessed differently than other exported functionality and types.
   */
  lifecycle?: Lifecycle;

  /**
   * Used to create links to github to view the code for this API.
   */
  source: {
    path: string;
    lineNumber: number;
  };
}

```

## Overview

The first stage is to collect the list of plugins using the existing `findPlugins` logic, with [some new fields](#proposed-plugin-changes).

For every plugin, the initial list of api nodes are collected from three "scopes":
 - plugin/public/index.ts
 - plugin/server/index.ts
 - plugin/common/index.ts

Every node in each list is then recursively transformed into a json structure that represents a plugin's public API with an array of `PluginDocDef`.

This is converted into one or more json files per plugin, depending on the value of `serviceFolders` inside the plugin's manifest files. One mdx
file per json file is also created, which passes the data inside the json into an elastic-docs component for pretty rendering.

## Manifest file changes

**serviceFolders?: string[]**

Used by the system to group services into sub-pages. Some plugins, like data and core, have such huge APIs they are very slow to contain in a single page. It’s also less usable by developers. The addition of an optional list of services folders will cause the system to automatically create a separate page with every API that is defined within that folder.

**Using a kibana.json file for core**

For the purpose of API infrastructure, core is treated like any other plugin. This means it has to specify serviceFolders section inside a manifest file to be split into sub folders. There are other ways to tackle this - like a hard coded array just for the core folder, but I kept the logic as similar to the other plugins as possible.

**teamOwner: string**

Team owner can be determined via github CODEOWNERS file, but we want to encourage single team ownership per plugin. Requiring a team owner string in the manifest file will help with this and will allow the API doc system to manually add a section to every page that has a link to the team owner. Additional ideas are teamSlackChannel or teamEmail for further contact. 

**summary: string**

A brief description of the plugin can then be displayed in the automatically generated API documentation.

## Technology: ts-morph vs api-extractor

[Api-extractor](https://api-extractor.com/) is a utility built from microsoft that parses typescript code into json files that can then be used in a custom [api-documenter](https://api-extractor.com/pages/setup/generating_docs/) in order to build documentation. This is what we [have now](https://github.com/elastic/kibana/tree/master/docs/development), except we use the default api-documenter. Unfortunately, because our plugins aren’t separate packages, and the way api-extractor works, we can’t build cross plugin links this way.

[ts-morph](https://github.com/dsherret/ts-morph) is a utility built and maintained by a single person, which sits a layer above the raw typescript compiler. It affords greater flexibility, thus supports cross plugin links (among other things like links to source files). The downsides of using this library are:

 - Risks of relying on a package maintained by a single developer
 - Less re-usability across repositories. What if EUI wanted to use the same system?  

I recommend we move ahead with ts-morph, acknowleding the possibility of migrating to api-extractor in the future. If so, the effort shouldn’t be a large one.

# Adoption strategy

In order to generate useful API documentation, we need to approach this by two sides.

1. Establish a habit of writing documentation.
2. Establish a habit of reading documentation.

Currently what often happens is a developer asks another developer a question directly, and it is answered. Every time this happens, ask yourself if
there is a link you can share instead of a direct answer. If there isn't, file an issue for that documentation to be created. When we start responding
to questions with links, solution developers will naturally start to look in the documentation _first_, saving everyone time!

The APIs also need to be well commented or they are not as useful. We can measure the amount of missing comments and set a goal of reducing this number.

# Unresolved questions

## REST API

This RFC does not cover REST API documentation, though it worth considering where
REST APIs registered by plugins should go in the docs.
