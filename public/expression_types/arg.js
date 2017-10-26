import { createEagerElement } from 'recompose';
import { pick, isUndefined } from 'lodash';
import { ArgForm } from '../components/arg_form';
import { argTypeRegistry } from './arg_type';

export class Arg {
  constructor(props) {
    const propNames = [
      'name',
      'displayName',
      'help',
      'multi',
      'required',
      'types',
      'default',
      'resolve',
      'options',
    ];

    const argType = argTypeRegistry.get(props.argType);
    if (!argType) throw new Error(`Invalid arg type: ${props.argType}`);
    if (!props.name) throw new Error('Args must have a name property');

    // properties that can be passed in
    const defaultProps = {
      displayName: props.name,
      help: argType.help || `Argument: ${props.name}`,
      multi: false,
      required: false,
      types: [],
      default: isUndefined(argType.default) ? null : argType.default,
      options: {},
      resolve: () => ({}),
    };

    Object.assign(this, defaultProps, pick(props, propNames), {
      argType,
    });
  }

  // TODO: Document what these otherProps are. Maybe make them named arguments?
  render({ onValueChange, onValueRemove, argValue, key, label, ...otherProps }) {
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
      label,
      onValueChange,
      onValueRemove,
      templateProps,
    };

    return createEagerElement(ArgForm, formProps);
  }
}
