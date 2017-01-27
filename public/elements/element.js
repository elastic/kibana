import Arg from 'plugins/rework/arg_types/arg';

export default class Element {
  constructor(name, props) {

    // The name, aka id of this type of element
    this.name = name;

    // The name to show users
    this.displayName = props.displayName;

    // A React components that receives ({args}), the resolved form of the arguments below.
    this.template = props.template;

    // An icon to show users
    this.icon = props.icon || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiA' +
    'xNiI+PHBhdGggZD0iTTggMkE0IDQgMCAwIDAgNCA2SDVBMyAzIDAgMCAxIDggMyAzIDMgMCAwIDEgMTEgNiAzIDMgMCAwIDEgOCA5SDdWMTJI' +
    'OFYxMEE0IDQgMCAwIDAgMTIgNiA0IDQgMCAwIDAgOCAyTTcgMTNWMTRIOFYxM0g3IiBmaWxsPSIjNGQ0ZDRkIi8+PC9zdmc+';

    // An array of Arg objects, these will be used to feed the template, as well as build a form for configuring the element
    this.args = props.args;

    // A CSS stylesheet. Note that you can use {{args.somevalue}} in the sheet to get the values of your arguments
    this.stylesheet = props.stylesheet || '__noStyle_noClass_JustLikeMe {border: 2px solid #f00;}';

    this.args.push(new Arg('_container_style', {
      displayName: 'Element Style',
      type: 'container_style',
      help: ''
    }));

    // Every element gets a custom style sheet too, this is supplied by the user if they wish
    this.args.push(new Arg('_custom_style', {
      displayName: 'Custom CSS',
      type: 'style',
    }));
  }
}
