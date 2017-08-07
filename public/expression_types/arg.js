import React from 'react';
import { pick, isUndefined } from 'lodash';
import { ArgForm } from '../components/arg_form';
import { argTypeRegistry } from './arg_type';
import { toInterfaceValue } from '../lib/map_arg_value';

export class Arg {
  constructor(name, props) {
    const propNames = ['displayName', 'description', 'multi', 'types', 'defaultValue', 'resolve', 'options'];
    const argType = argTypeRegistry.get(props.argType);
    if (!argType) throw new Error(`Invalid arg type: ${props.argType}`);

    // properties that can be passed in
    const defaultProps = {
      displayName: name,
      description: name,
      multi: false,
      types: [],
      defaultValue: isUndefined(argType.defaultValue) ? '' : argType.defaultValue,
      options: {},
      resolve: () => ({}),
    };

    Object.assign(this, defaultProps, pick(props, propNames), {
      name,
      argType,
    });
  }

  // TODO: Document what these props are. Maybe make them named arguments?
  render({ onValueChange, onValueRemove, argValue, ...props }) {

    // This is everything the template needs to render
    const templateProps = {
      ...props,
      ...this.resolve(props),
      onValueChange,
      argValue: toInterfaceValue(argValue, this.multi),
      typeInstance: this,
    };

    return (
      <ArgForm
        argTypeInstance={this}
        onValueChange={onValueChange}
        onValueRemove={onValueRemove}
        templateProps={templateProps}/>
    );


  }
}
