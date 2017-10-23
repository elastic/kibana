import { createEagerElement } from 'recompose';
import { pick, isUndefined } from 'lodash';
import { ArgForm } from '../components/arg_form';
import { argTypeRegistry } from './arg_type';

export class Arg {
  constructor(props) {
    const propNames = [
      'name',
      'displayName',
      'description',
      'multi',
      'required',
      'types',
      'defaultValue',
      'resolve',
      'options',
    ];

    const argType = argTypeRegistry.get(props.argType);
    if (!argType) throw new Error(`Invalid arg type: ${props.argType}`);
    if (!props.name) throw new Error('Args must have a name property');

    // properties that can be passed in
    const defaultProps = {
      displayName: props.name,
      description: argType.description || props.name,
      multi: false,
      required: false,
      types: [],
      defaultValue: isUndefined(argType.defaultValue) ? null : argType.defaultValue,
      options: {},
      resolve: () => ({}),
    };

    Object.assign(this, defaultProps, pick(props, propNames), {
      argType,
    });
  }

  // TODO: Document what these otherProps are. Maybe make them named arguments?
  render({ onValueChange, onValueRemove, argValue, key, ...otherProps }) {
    // This is everything the template needs to render
    const templateProps = {
      ...otherProps,
      ...this.resolve(otherProps),
      onValueChange,
      argValue,
      typeInstance: this,
    };

    const formProps = {
      key,
      argTypeInstance: this,
      valueMissing: (this.required && argValue == null),
      onValueChange,
      onValueRemove,
      templateProps,
    };

    return createEagerElement(ArgForm, formProps);
  }
}
