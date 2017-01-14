export default class ArgType {
  constructor(name, props) {
    this.name = name;
    this.resolve = props.resolve;
    this.form = props.form;
    this.help = props.help;
  }
}
