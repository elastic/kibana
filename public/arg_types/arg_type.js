export default class ArgType {
  constructor(name, props) {

    // The name of this argument type
    this.name = name;

    // The function to resolve the argument.
    this.resolve = props.resolve;

    // The default unresolved value
    this.default = props.default;

    // A React component to use as the form
    this.form = props.form; // (value, state) => {}

    // Default help text if not overridden on the arg level
    this.help = props.help;
  }
}
