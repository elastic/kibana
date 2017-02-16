export default class ArgType {
  constructor(name, props) {

    // The name of this argument type
    this.name = name;

    // The function to resolve the argument.
    this.resolve = props.resolve;

    // The default unresolved value, can be overridden at the arg level
    this.default = props.default;

    // Should this argument type be expanded by default? You can override this at the arg level
    this.expand = props.expand === undefined ? false : true;

    // A React component to use as the form
    this.form = props.form; // (value, state) => {}

    // Default help text if not overridden on the arg level
    this.help = props.help;
  }
}
