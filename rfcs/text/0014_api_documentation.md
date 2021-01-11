- Start Date: 2020-12-21
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Automatically generate API documentation for every plugin that exposes a public API within Kibana.
This does not cover REST API docs, but is targetted towards our javascript
plugin APIs.

# Terminology

**API** - Every function, class, interface, type, variable, etc that a plugin exports from it's index.ts file, or start or setup
contract, is part of the plugins public functionality and services. This set of functionality is called a plugins _API_.

**Declaration** - Each function, class, interface, type, variable, etc, that is part of a plugins public API is a "declaration". This
terminology is motivated by [these docs](https://www.typescriptlang.org/docs/handbook/modules.html#exporting-a-declaration).

# Information available for each declaration

We have the following pieces of information available from each declaration:

- Label. The name of the function, class, interface, etc.

- Description. Any comment that was able to be extracted.

- Tags. Any `@blahblah` tags that were extracted from comments. Will allow us to mark certain functionality or types as beta or 
deprecated and show them differently in the UI.

- Kind. This can be thought of as the _kind_ of type. It allows us to group each type into a category. It can be a primitive, or a
more complex grouping. Possibilities are: array, string, number, boolean, object, class, interface, function, compound (unions or intersections)

- Required or optional. (whether or not the type was written with `| undefined` or `?`). This terminology makes the most sense for function
parameters. It degrades when thinking about an exported variable that might be undefined.

- Signature. This is only relevant for some types: functions, objects, type, arrays and compound. Classes and interfaces would be too large.
For primitives, this is equivalent to "type".

- Children. Only relevant for some types, this would include parameters for functions, class members and functions for classes, properties for
interfaces and objects. This makes the structure recursive. Each child is a nested API component.

- Return comment. Only relevant for function types.

![image](../images/api_info.png)

```ts
interface ApiDec {
  label: string;
  type: TypeKind; // string, number, boolean, class, interface, function, type, etc.
  description: TextWithLinks;
  signature: TextWithLinks;
  tags: string[];  // Declarations may be tagged as beta, or deprecated.
  children: ApiDec[]; // Recursive - this could be function parameters, class members, or interface/object properties.
  returnComment?: TextWithLinks
}

```

# Architecture design

## Hosting

In the short term, the generated docs will reside inside the kibana repo, inside a top level `api_docs` folder. In the long term, we could investigate having the docs system run a script to generated the mdx files, so we don’t need to store them inside the repo.

They will be hosted online wherever the new docs system ends up. This can temporarily be accessed at https://elasticdocstest.netlify.app/docs/.

## Types

### TypeKind

TypeKind is an enum that will identify what "category" or "group" name we can call this particular export. Is it a function, an interface, a class a variable, etc.
This list is likely incomplete, and we'll expand as needed.

```ts
export enum TypeKind {
  ClassKind = 'Class',
  FunctionKind = 'Function',
  ObjectKind = 'Object',
  InterfaceKind = 'Interface',
  /**
   * Maps to the typescript syntax kind `TypeReferences`. Would be used for example with `export type Foo = ...`
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
   * This will cover things like string | number, or A & B, for lack of something better.
   */
  CompoundType = 'CompoundType',
}
```


### Text with reference links

This may only be needed in phase 1. If we can embed DocLink components inside the description, or signature,
we could use something like a react component type for those properties. However, we'll need to build the
text with those DocLinks, and this information will allow us to do that.

```ts
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
```

### A plugin's API

A plugins API is broken into public, server and common components.  `serviceFolders` is a way for the system to
write separate mdx files depending on where each declaration is defined. This is because certain plugins (and core)
are huge, and can't be rendered in a single page.

```ts
export interface PluginApi {
  id: string;
  serviceFolders?: readonly string[];
  public: ApiDec[];
  server: ApiDec[];
  common: ApiDec[];
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
