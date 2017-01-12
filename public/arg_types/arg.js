import argTypes from 'plugins/rework/arg_types/arg_types';

export default class Arg {
  constructor(name, props) {
    this.name = name;
    this.type = argTypes.byName[props.type];
    this.default = props.default === undefined ? this.type.default : props.default;
  }
}
