export default class Element {
  constructor(name, props) {
    this.name = name;
    this.displayName = props.displayName;
    this.template = props.template;
    this.args = props.args;
  }
}
