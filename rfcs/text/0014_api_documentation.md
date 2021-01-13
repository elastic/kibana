- Start Date: 2020-12-21
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Goal

Automatically generate API documentation for every plugin that exposes a public API within Kibana.
This does not cover REST API docs, but is targetted towards our javascript
plugin APIs.

# Terminology

**API** - A plugin's public API consists of every function, class, interface, type, variable, etc, that is exported from it's index.ts file, or returned from it's start or setup
contract. 

**Declaration** - Each function, class, interface, type, variable, etc, that is part of a plugins public API is a "declaration". This
terminology is motivated by [these docs](https://www.typescriptlang.org/docs/handbook/modules.html#exporting-a-declaration).

# Screenshot

Every plugin will have one or more API reference pages. Every exported declaration will be listed in the page. It is first split by "scope" - client, server and common. Underneath
that, setup and start contracts are at the top, the remaining declarations are grouped by type (classes, functions, interfaces, etc).
Plugins may opt to have their API split into "service" sections (see [proposed manifest file changes](#manifest-file-changes)). If a plugin uses service folders, the API doc system will automatically group declarations that are defined inside the service folder name. This is a simple way to break down very large plugins. The start and setup contract will
always remain with the main plugin name.

![image](../images/api_docs.png)


# Information available for each declaration

We have the following pieces of information available from each declaration:

- Label. The name of the function, class, interface, etc.

- Description. Any comment that was able to be extracted. Currently it's not possible for this data to be formatted, for example if it has a code example with back tics. This
is dependent on the elastic-docs team moving the infrastructure to NextJS instead of Gatsby, but it will eventually be supported.

- Tags. Any `@blahblah` tags that were extracted from comments. Known tags, like `beta`, will be show help text in a tooltip when hovered over.

- Type. This can be thought of as the _kind_ of type. It allows us to group each type into a category. It can be a primitive, or a
more complex grouping. Possibilities are: array, string, number, boolean, object, class, interface, function, compound (unions or intersections)

- Required or optional. (whether or not the type was written with `| undefined` or `?`). This terminology makes the most sense for function
parameters. It degrades when thinking about an exported variable that might be undefined.

- Signature. This is only relevant for some types: functions, objects, type, arrays and compound. Classes and interfaces would be too large.
For primitives, this is equivalent to "type".

- Children. Only relevant for some types, this would include parameters for functions, class members and functions for classes, properties for
interfaces and objects. This makes the structure recursive. Each child is a nested API component.

- Return comment. Only relevant for function types.

![image](../images/api_info.png)


### ApiDeclaration type

```ts
interface ApiDeclaration {
  label: string;
  type: TypeKind; // string, number, boolean, class, interface, function, type, etc.
  description: TextWithLinks;
  signature: TextWithLinks;
  tags: string[];  // Declarations may be tagged as beta, or deprecated.
  children: ApiDeclaration[]; // Recursive - this could be function parameters, class members, or interface/object properties.
  returnComment?: TextWithLinks
}

```

# Architecture design

## Location

The generated docs will reside inside the kibana repo, inside a top level `api_docs` folder. In the long term, we could investigate having the docs system run a script to generated the mdx files, so we don’t need to store them inside the repo. Every ci run should destroy and re-create this folder so removed plugins don't have lingering documentation files.

They will be hosted online wherever the new docs system ends up. This can temporarily be accessed at https://elasticdocstest.netlify.app/docs/.

## Algorithm overview

The first stage is to collect the list of plugins using the existing `findPlugins` logic.

For every plugin, the initial list of ts-morph api node declarations are collected from three "scope" files:
 - plugin/public/index.ts
 - plugin/server/index.ts
 - plugin/common/index.ts

Each ts-morph declaration is then transformed into an [ApiDeclaration](#ApiDeclaration-type) type, which is recursive due to the `children` property. Each
type of declaration is handled slightly differently, mainly in regard to whether or not a signature or return type is added, and how children are added.

For example:

```ts
if (node.isClassDeclaration()) {
  // No signature or return.
  return {
    label,
    description,
    type: TypeKind.ClassKind,
    // The class members are captured in the children array.
    children: getApiDeclaration(node.getMembers()),
  }
} else if (node.isFunctionDeclaration()) {
    return {
    label,
    description,
    signature: getSignature(node),
    returnComment: getReturnComment(node),
    type: TypeKind.FunctionKind,
    // The function parameters are captured in the children array. This logic is more specific because
    // the comments for a function parameter are captured in the function comment, with "@param" tags.
    children: getParameterList(node.getParameters(), getParamTagComments(node)),
  }
} if (...) 
....
```

The handling of each specific type is what encompasses the vast majority of the logic in the PR.

A [PluginApi](#pluginapi) is generated for each plugin, which is used to generate the json and mdx files. One or more json/mdx file pair
 per plugin may be created, depending on the value of `serviceFolders` inside the plugin's manifest files. This is because some plugins have such huge APIs that
 it is too large to render in a single page.

![image](../images/api_doc_tech.png)

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
  TypeKind = 'Type', // For things like `export type Foo = ...`
  Unknown = 'Unknown', // There are a lot of ts-morph types, if I encounter something not handled, I dump it in here.
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'Array',
  CompoundType = 'CompoundType', // Unions & intersections, to handle things like `string | number`. 
}
```


### Text with reference links

Signatures, descriptions and returns comments may all contain links to other API declarations. This information needs to be serializable into json. This serializable type encompasses the information needed to build the DocLink components within these fields. The logic of building
the DocLink components currently resides inside the elasticdocs system. It's unclear if this will change.

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

### ScopeApi

Scope API is essentially just grouping an array of ApiDeclarations into different categories that makes building the mdx files from a
single json file easier.

```ts
export interface ScopeApi {
  setup?: ApiDeclaration;
  start?: ApiDeclaration;
  classes: ApiDeclaration[];
  functions: ApiDeclaration[];
  interfaces: ApiDeclaration[];
  objects: ApiDeclaration[];
  enums: ApiDeclaration[];
  misc: ApiDeclaration[];
  // We may add more here as we sit fit to pull out of `misc`.
}
```

With this structure, the mdx files end up looking like:

```
### Start
<DocDefinitionList data={[actionsJson.server.start]}/>
### Functions
<DocDefinitionList data={actionsJson.server.functions}/>
### Interfaces
<DocDefinitionList data={actionsJson.server.interfaces}/>
```

### PluginApi

A plugins API is the component that is serialized into the json file. It is broken into public, server and common components.  `serviceFolders` is a way for the system to
write separate mdx files depending on where each declaration is defined. This is because certain plugins (and core)
are huge, and can't be rendered in a single page.


```ts
export interface PluginApi {
  id: string;
  serviceFolders?: readonly string[];
  client: ScopeApi;
  server: ScopeApi;
  common: ScopeApi;
}
```

## Manifest file changes

**serviceFolders?: string[]**

Used by the system to group services into sub-pages. Some plugins, like data and core, have such huge APIs they are very slow to contain in a single page, and they are less consummable by solution developers. The addition of an optional list of services folders will cause the system to automatically create a separate page with every API that is defined within that folder. The caveat is that core will need to define a manifest file in order to define its service folders...

**Using a kibana.json file for core**

For the purpose of API infrastructure, core is treated like any other plugin. This means it has to specify serviceFolders section inside a manifest file to be split into sub folders. There are other ways to tackle this - like a hard coded array just for the core folder, but I kept the logic as similar to the other plugins as possible.

**teamOwner: string**

Team owner can be determined via github CODEOWNERS file, but we want to encourage single team ownership per plugin. Requiring a team owner string in the manifest file will help with this and will allow the API doc system to manually add a section to every page that has a link to the team owner. Additional ideas are teamSlackChannel or teamEmail for further contact. 

**summary: string**

A brief description of the plugin can then be displayed in the automatically generated API documentation.

## Technology: ts-morph vs api-extractor

[Api-extractor](https://api-extractor.com/) is a utility built from microsoft that parses typescript code into json files that can then be used in a custom [api-documenter](https://api-extractor.com/pages/setup/generating_docs/) in order to build documentation. This is what we [have now](https://github.com/elastic/kibana/tree/master/docs/development), except we use the default api-documenter. Currently our plugins aren’t separate packages, and given the way api-extractor works, we can’t build cross plugin links. We could potentially work around this
by supplying a `packageJsonFullPath` to a generated `packageJson` with the name of the plugin, in order to get the correct package names in the generated api.json files.

It is unknown whether the work with bazel will allow us to use this technology. I suspect not, because even though there will be separate `.d.ts` files, the plugins will still be importing types via relative links.

[ts-morph](https://github.com/dsherret/ts-morph) is a utility built and maintained by a single person, which sits a layer above the raw typescript compiler. It affords greater flexibility, thus supports cross plugin links (among other things like links to source files). The downsides of using this library are:

 1. Risks of not being able to upgrade typescript without significant effort in the docs system.
 2. Risks of relying on a package maintained by a single developer.
 3. Less re-usability across repositories. What if EUI wanted to use the same system?  

The first risk is the most concerning, as Kibana needs to be able to upgrade typescript.

### Recommendation: ts-morph

I recommend that we move ahead with ts-morph because we have a working implementation today, one that offers capabilities not possible with api-extractor, such as
cross plugin linking and source file links. I consider cross plugin links essential to useful docs. In addition, both options require custom code that will come with a mainenance burden, since the
default api-documenter (that is in use today) does not provide very useful
results (for example, one file per declaration).

We should however be prepared to re-evalute an api-extractor implementation, based on progress made in that repository, as well as what happens with the risks mentioned above.
We should also be prepared to make the difficult decision to turn off our API reference documentation if it inhibits us from upgrading typescript, and the 
realized efforts of maintaining our ts-morph implementation.

![image](../images/api_doc_tech_compare.png)

# Recommendations for writing comments

## @link comments for the referenced type

Core has a pattern of writing comments like this:

```ts
  /** {@link IUiSettingsClient} */
  uiSettings: IUiSettingsClient;
```

I don't see the value in this. In the IDE, I can click on the IUiSettingsClient type and get directed there, and in the API doc system, the
type will already be clickable. This ends up with a weird looking API:

![image](../images/repeat_type_links.png)

The plan is to make @link comments work like links, which means this is unneccessary information.

I propose we avoid this kind of pattern.

## Double check complicated types

I haven't taken a look at every kind of possible crazy type that we can come up with. For example - I'm not sure how generics will
look. I suggest an iterative approach. Start simple, see what looks awkward, work to make it look better.

## Export every referenced type

The docs system handles broken link warnings but to avoid breaking the ci, I suggest we turn this off initially. This will mean however,
that we may miss situations where we are referencing a type that is not actually exported. This will cause a broken link in the docs
system

For example if your index.ts file has:
```ts
export type foo: string | AnInterface;
```

and does not also export `AnInterface`, this will be a broken link in the docs system.

Until we have better ci tools to catch these mistakes, developers will need to export every referenced type.

## Avoid `Pick` pattern

Connected to the above, if you use `Pick`, there are two problems. One is that it's difficult for a developer to see the functionality
available to them at a glance, since they would have to keep flipping from the interface definition to the properties that have been picked.

The second potential problem is that you will have to export the referenced type, and in some situations, it's an internal type that isn't exported.

![image](../images/api_doc_pick.png)

# Open questions

## Required attribute

`isRequired` is an optional parameter that can be used to display a badge next to the API.
We can mark function parameters that do not use `?` or `| undefined` as required. Open questions:

1. Are we okay with a badge showing for `required` rather than `optional` when marking a parameter as optional is extra work for a developer, and `required` is the default?

2. Should we only mark function parameters as `required` or interface/class parameters? Essentially, should any declaration that is not nullable
have the `required` tag?

## Signatures on primitive types

1. Should we _always_ include a signature for variables and parameters, even if they are a repeat of the TypeKind? For example:

![image](../images/repeat_primitive_signature.png)

2. If no, should we include signatures when the only difference is `| undefined`? For function parameters this information is captured by
the absence of the `required` badge. Is this obvious? What about class members/interface props?

## REST API

This RFC does not cover REST API documentation, though it worth considering where
REST APIs registered by plugins should go in the docs. The docs team has a proposal for this but it is not inside the `Kibana Developer Docs` mission.

# Adoption strategy

In order to generate useful API documentation, we need to approach this by two sides.

1. Establish a habit of writing documentation.
2. Establish a habit of reading documentation.

Currently what often happens is a developer asks another developer a question directly, and it is answered. Every time this happens, ask yourself if
there is a link you can share instead of a direct answer. If there isn't, file an issue for that documentation to be created. When we start responding
to questions with links, solution developers will naturally start to look in the documentation _first_, saving everyone time!

The APIs WILL need to be well commented or they won't be useful. We can measure the amount of missing comments and set a goal of reducing this number.

# External documentation system examples

- [Microsoft .NET](https://docs.microsoft.com/en-us/dotnet/api/microsoft.visualbasic?view=netcore-3.1)
- [Android](https://developer.android.com/reference/androidx/packages)