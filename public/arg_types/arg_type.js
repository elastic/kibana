export default class ArgType {
  constructor(name, props) {
    this.name = name;

    this.resolve = props.resolve;
    this.default = props.default;
    this.form = props.form; // (value, state) => {}
    this.help = props.help;
  }
}
