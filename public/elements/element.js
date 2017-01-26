import Arg from 'plugins/rework/arg_types/arg';

export default class Element {
  constructor(name, props) {
    this.name = name;
    this.displayName = props.displayName;
    this.template = props.template;
    this.icon = props.icon || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiA' +
    'xNiI+PHBhdGggZD0iTTggMkE0IDQgMCAwIDAgNCA2SDVBMyAzIDAgMCAxIDggMyAzIDMgMCAwIDEgMTEgNiAzIDMgMCAwIDEgOCA5SDdWMTJI' +
    'OFYxMEE0IDQgMCAwIDAgMTIgNiA0IDQgMCAwIDAgOCAyTTcgMTNWMTRIOFYxM0g3IiBmaWxsPSIjNGQ0ZDRkIi8+PC9zdmc+';
    this.args = props.args;
    this.args.push(new Arg('_style', {
      displayName: 'style',
      type: 'style',
      default: ''
    }));
  }
}
