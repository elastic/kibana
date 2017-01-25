import Arg from 'plugins/rework/arg_types/arg';

export default class Element {
  constructor(name, props) {
    this.name = name;
    this.displayName = props.displayName;
    this.template = props.template;
    this.args = props.args;
    this.args.push(new Arg('_style', {
      displayName: 'style',
      type: 'style',
      default: ''
    }));
  }
}
