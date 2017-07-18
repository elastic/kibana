import { createElement } from 'react';
import { pick } from 'lodash';
import { argTypeRegistry } from './arg_type';
import { toInterfaceValue } from '../lib/map_arg_value';

export class Arg {
  constructor(name, props) {
    const propNames = ['displayName', 'description', 'multiVal', 'types', 'resolve', 'options'];
    const argType = argTypeRegistry.get(props.argType);
    if (!argType) throw new Error(`Invalid arg type: ${props.argType}`);

    // properties that can be passed in
    const defaultProps = {
      displayName: name,
      description: name,
      multiVal: false,
      options: {},
      types: [],
      resolve: () => ({}),
    };

    Object.assign(this, defaultProps, pick(props, propNames), {
      name,
      argType,
    });
  }

  render(props) {
    return createElement(this.argType.template, {
      ...props,
      ...this.resolve(props),
      argValue: toInterfaceValue(props.argValue, this.multiVal),
      typeInstance: this,
    });
  }
}
