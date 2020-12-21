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

## Overview

The first stage is to collect the list of plugins using the existing `findPlugins` logic, with [some new fields](#proposed-plugin-changes).

For every plugin, the initial list of api nodes are collected from three "scopes":
 - plugin/public/index.ts
 - plugin/server/index.ts
 - plugin/common/index.ts

Every node in each list is then recursively transformed into a json structure that represents a plugin's public API:

```ts

/**
 * Contains all the information neccessary to build API docs for this particular plugin.
 */
export interface PluginApiDef {
  id: string;
  serviceFolders?: readonly string[];
  public: ApiDocDef[];
  server: ApiDocDef[];
  common: ApiDocDef[];
}

/**
 * Contains all the information neccessary to render a single API inside the docs system.
 */
export interface ApiDocDef {
  /**
   * Used to create an anchor link to this API.
   */
  id?: string;

  /**
   * The name of the api.
   */
  label: string;

  /**
   * The kind of type this API represents, e.g. string, number, Object, Interface, Class.
   */
  type: TypeKind;

  /**
   * Certain types have children. For instance classes have class members, functions will list
   * their parameters here, classes will list their class members here, and objects and interfaces
   * will list their properties. The elastic-docs system can use the `type` to potentially render
   * these children differently.
   */
  children?: ApiDocDef[];

  /**
   * Api node comment.
   */
  description?: TextWithLinks;

  /**
   * If the type is a function, it's signature should be displayed. Currently this overlaps with type
   * sometimes, and will sometimes be left empty for large types (like classes and interfaces).
   */
  signature?: TextWithLinks;

  // Relevant for functions with @returns comments.
  returnComment?: TextWithLinks;

  // Will contain the tags on a comment, like `beta` or `deprecated`.
  // Won't include param or returns tags.
  tags?: string[];

  // Every plugn that exposes functionality from their setup and start contract
  // should have a single exported type for each. These get pulled to the top because
  // they are accessed differently than other exported functionality and types.
  lifecycle?: Lifecycle;

  /**
   * Used to create links to github to view the code for this API.
   */
  source: {
    path: string;
    lineNumber: number;
  };
}

enum TypeKind {
  ClassKind = 'Class',
  FunctionKind = 'Function',
  VariableKind = 'Variable',
  ObjectKind = 'Object',
  InterfaceKind = 'Interface',
  TypeKind = 'Type',
  Unknown = 'Unknown',
  Parameter = 'Parameter',
  Property = 'Property',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'Array',
}

/**
 * 
 */
type TextWithLinks = string | Array<string | Reference>;

interface Reference {
  docId: string;
  section: string;
  text: string;
}
```

## Technology: ts-morph vs api-extractor

[Api-extractor](https://api-extractor.com/) is a utility built from microsoft that parses typescript code into json files that can then be used in a custom [api-documenter](https://api-extractor.com/pages/setup/generating_docs/) in order to build documentation. This is what we [have now](https://github.com/elastic/kibana/tree/master/docs/development), except we use the default api-documenter. Unfortunately, because our plugins aren’t separate packages, and the way api-extractor works, we can’t build cross plugin links this way.

[ts-morph](https://github.com/dsherret/ts-morph) is a utility built and maintained by a single person, which sits a layer above the raw typescript compiler. It affords greater flexibility, thus supports cross plugin links (among other things like links to source files). The downsides of using this library are:

 - Risks of relying on a package maintained by a single developer
 - Less re-usability across repositories. What if EUI wanted to use the same system?  

I recommend we move ahead with ts-morph, acknowleding the possibility of migrating to api-extractor in the future. If so, the effort shouldn’t be a large one.



# Drawbacks

Why should we *not* do this? Please consider:

- implementation cost, both in term of code size and complexity
- the impact on teaching people Kibana development
- integration of this feature with other existing and planned features
- cost of migrating existing Kibana plugins (is it a breaking change?)

There are tradeoffs to choosing any path. Attempt to identify them here.

# Alternatives

What other designs have been considered? What is the impact of not doing this?

# Adoption strategy

If we implement this proposal, how will existing Kibana developers adopt it? Is
this a breaking change? Can we write a codemod? Should we coordinate with
other projects or libraries?

# How we teach this

What names and terminology work best for these concepts and why? How is this
idea best presented? As a continuation of existing Kibana patterns?

Would the acceptance of this proposal mean the Kibana documentation must be
re-organized or altered? Does it change how Kibana is taught to new developers
at any level?

How should this feature be taught to existing Kibana developers?

# Unresolved questions

## REST API

This RFC does not cover REST API documentation, though it worth considering where
REST APIs registered by plugins should go in the docs.
