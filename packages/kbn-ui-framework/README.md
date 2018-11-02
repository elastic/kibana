# Kibana UI Framework

> The Kibana UI Framework is a collection of React UI components for quickly building user interfaces
> for Kibana. Not using React? No problem! You can still use the CSS behind each component.

## Using the Framework

### Documentation

Compile the CSS with `npx grunt uiFramework:compileCss`.

You can run `node scripts/jest --watch` to watch for changes and run the tests as you code.

You can run `node scripts/jest --coverage` to generate a code coverage report to see how
fully-tested the code is.

See the documentation in [`scripts/jest.js`](../scripts/jest.js) for more options.

## Principles

### Logically-grouped components

If a component has subcomponents (e.g. ToolBar and ToolBarSearch), tightly-coupled components (e.g.
Button and ButtonGroup), or you just want to group some related components together (e.g. TextInput,
TextArea, and CheckBox), then they belong in the same logical grouping. In this case, you can create
additional SCSS files for these components in the same component directory.

### Writing CSS

Check out our [CSS style guide](https://github.com/elastic/kibana/blob/master/style_guides/css_style_guide.md)
and [SCSS style guide](https://github.com/elastic/kibana/blob/master/style_guides/scss_style_guide.md).

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
