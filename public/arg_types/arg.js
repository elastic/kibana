import argTypes from 'plugins/rework/arg_types/arg_types';

export default class Arg {
  constructor(name, props) {
    this.name = name;
    this.type = argTypes.byName[props.type];

    // This can be a value or a function. If it is a function then it will be passed state.
    // eg (state) => {return state.some.value}; is acceptable
    this.default = props.default === undefined ? this.type.default : props.default;
  }
}
