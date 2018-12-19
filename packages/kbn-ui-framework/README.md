# Kibana UI Framework

> The Kibana UI Framework is a collection of React UI components for quickly building user interfaces
> for Kibana. Not using React? No problem! You can still use the CSS behind each component.

## Using the Framework

### Documentation

Compile the CSS with `./node_modules/grunt/bin/grunt uiFramework:compileCss` (OS X) or
`.\node_modules\grunt\bin\grunt uiFramework:compileCss` (Windows).

You can view interactive documentation by running `yarn uiFramework:start` and then visiting
[http://localhost:8020/](http://localhost:8020/). This will also start watching the SCSS files, and will recompile the CSS
automatically for you when you make changes.

You can run `node scripts/jest --watch` to watch for changes and run the tests as you code.

You can run `node scripts/jest --coverage` to generate a code coverage report to see how
fully-tested the code is.

See the documentation in [`scripts/jest.js`](../scripts/jest.js) for more options.

## Creating components

There are four steps to creating a new component:

1. Create the SCSS for the component in `packages/kbn-ui-framework/src/components`.
2. Create the React portion of the component.
3. Write tests.
4. Document it with examples in `packages/kbn-ui-framework/doc_site`.

You can do this using Yeoman (the easy way), or you can do it manually (the hard way).

### Using Yeoman

#### Create a new component

From the command line, run `yarn uiFramework:createComponent`.

First, you'll be prompted for what kind of component to create:

| Choice | Description |
|---|---|
| Stateless function | A stateless functional React component |
| Component class | A class-based React component |

Next, you'll enter a series of prompts.

#### "What's the name of this component?"

Yeoman will ask you what to name the file. It expects you to provide the name
in snake case. Yeoman will automatically add file extensions and a "kui" prefix so you should leave those out.

#### "Where do you want to create this component's files?"

This defaults to the last directory you specified for this prompt, or to the UI Framework's
components directory if you haven't specified one. To change this location, type in the path to the
directory where the files should live.

If you want Yeoman to automatically generate a directory to organize the files,
that directory will be created inside of the location you specify (see next prompt).

#### "Does it need its own directory?""

This defaults to `YES`. This will automatically generate a directory with the
same name as the file, but without a "kui" prefix.

#### Done!

Yeoman will generate the files you need in your project's folder system.

For your convenience, it will also output some snippets you can tweak to import
and re-export the generated JS and SCSS files.

### Manually

#### Create component SCSS

1. Create a directory for your component in `packages/kbn-ui-framework/src/components`.
2. In this directory, create `_{component name}.scss`.
3. _Optional:_ Create any other components that should be [logically-grouped](#logically-grouped-components)
in this directory.
4. Create an `_index.scss` file in this directory that import all of the new component SCSS files
you created.
5. Import the `_index.scss` file into `packages/kbn-ui-framework/src/components/index.scss`.

This makes your styles available to Kibana and the UI Framework documentation.

#### Create the React component

1. Create the React component(s) in the same directory as the related SCSS file(s).
2. Export these components from an `index.js` file.
3. Re-export these components from `packages/kbn-ui-framework/src/components/index.js`.

This makes your React component available for import into Kibana.

#### Test the component

1. Start Jest in watch mode by running `node scripts/jest --watch`.
2. Create test files with the name pattern of `{component name}.test.js`.
3. Write your tests and see them fail or succeed.

To see how well the components have been covered by tests, you can run
`node scripts/jest --coverage` and check the generated report in
`target/jest-coverage/index.html`.

#### Document the component with examples

1. Create a directory for your example in `packages/kbn-ui-framework/doc_site/src/views`. Name it the name of the
component.
2. Create a `{component name}_example.js` file inside the directory. You'll use this file to define
the different examples for your component.
3. Add the route to this file in `packages/kbn-ui-framework/doc_site/src/services/routes/Routes.js`.
4. In the `{component name}_example.js` file you created, define examples which demonstrate the component and describe
its role from a UI perspective.

The complexity of the component should determine how many examples you need to create, and how
complex they should be. In general, your examples should demonstrate:

* The most common use-cases for the component.
* How the component handles edge cases, e.g. overflowing content, text-based vs. element-based
content.
* The various states of the component, e.g. disabled, selected, empty of content, error state.

## Creating documentation

You can use the same Yeoman generator referenced above to create documentation.

From the command line, run `yarn uiFramework:documentComponent`.

First, you'll be prompted for what kind of documentation to create:

| Choice | Description |
|---|---|
| Page | A page for documenting a component(s) with multiple demos |
| Page demo | An individual demo of a particular component use case |
| Sandbox | An empty document where you can do pretty much anything |

Just follow the prompts and your documentation files will be created.
You can use the snippets that are printed to the terminal to integrate these files into the UI Framework documentation site.

## Principles

### Logically-grouped components

If a component has subcomponents (e.g. ToolBar and ToolBarSearch), tightly-coupled components (e.g.
Button and ButtonGroup), or you just want to group some related components together (e.g. TextInput,
TextArea, and CheckBox), then they belong in the same logical grouping. In this case, you can create
additional SCSS files for these components in the same component directory.

## Benefits

### Dynamic, interactive documentation

By having a "living style guide", we relieve our designers of the burden of creating and maintaining
static style guides. This also makes it easier for our engineers to translate mockups, prototypes,
and wireframes into products.

### Copy-pasteable UI

Engineers can copy and paste sample code into their projects to quickly get reliable, consistent results.

### Remove CSS from the day-to-day

The CSS portion of this framework means engineers don't need to spend mental cycles translating a
design into CSS. These cycles can be spent on the things critical to the identity of the specific
project they're working on, like architecture and business logic.

If they use the React components, engineers won't even need to _see_ CSS -- it will be encapsulated
behind the React components' interfaces.

### More UI tests === fewer UI bugs

By covering our UI components with great unit tests and having those tests live within the framework
itself, we can rest assured that our UI layer is tested and remove some of that burden from our
integration/end-to-end tests.

## Why not just use Bootstrap?

In short: we've outgrown it! Third-party CSS frameworks like Bootstrap and Foundation are designed
for a general audience, so they offer things we don't need and _don't_ offer things we _do_ need.
As a result, we've been forced to override their styles until the original framework is no longer
recognizable. When the CSS reaches that point, it's time to take ownership over it and build
your own framework.

We also gain the ability to fix some of the common issues with third-party CSS frameworks:

* They have non-semantic markup.
* They deeply nest their selectors.

For a more in-depth analysis of the problems with Bootstrap (and similar frameworks), check out this
article and the links it has at the bottom: ["Bootstrap Bankruptcy"](http://www.matthewcopeland.me/blog/2013/11/04/bootstrap-bankruptcy/).

## Examples of other in-house UI frameworks

* [Smaato React UI Framework](http://smaato.github.io/ui-framework/#/modal)
* [Ubiquiti CSS Framework](http://ubnt-css.herokuapp.com/#/app/popover)
* [GitHub's Primer](http://primercss.io/)
* [Palantir's Blueprint](http://blueprintjs.com/docs/#components)
* [Lonely Planet Style Guide](http://rizzo.lonelyplanet.com/styleguide/design-elements/colours)
* [MailChimp Patterns Library](http://ux.mailchimp.com/patterns)
* [Salesforce Lightning Design System](https://www.lightningdesignsystem.com/)
* [Refills](http://refills.bourbon.io/)
* [Formstone](https://formstone.it/)
* [Element VueJS Framework](http://element.eleme.io/#/en-US/component/dialog)
