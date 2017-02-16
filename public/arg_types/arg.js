import argTypes from 'plugins/rework/arg_types/arg_types';

export default class Arg {
  constructor(name, props) {

    // The name of the arg as passed into the element renderer
    this.name = name;

    // A display name for the arg when rendering its form
    this.displayName = props.displayName || name;

    // Argument's type definition
    this.type = argTypes.byName[props.type];

    // This can be a value or a function. If it is a function then it will be passed state.
    // eg (state) => {return state.some.value};
    this.default = props.default === undefined ? this.type.default : props.default;

    // Should this argument's form be expanded by default?
    this.expand = props.expand === undefined ? this.type.expand : props.expand;

    // A short help text
    this.help = props.help === undefined ? this.type.help : props.help;

    // Any options to pass to the argument's form
    this.options = props.options || {};

  }
}
