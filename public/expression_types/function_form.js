import React from 'react';
import { Alert } from 'react-bootstrap';
import { isPlainObject, uniq, last } from 'lodash';
import { BaseForm } from './base_form';
import { fromExpression } from '../../common/lib/ast';
import { ArgAdd } from '../components/arg_add';

export class FunctionForm extends BaseForm {
  constructor(name, props) {
    super(name, {
      ...props,
    });

    this.args = props.args || [];
    this.resolve = props.resolve || (() => ({}));
  }

  renderArg(props, dataArg) {
    const { onValueRemove, onValueChange, ...passedProps } = props;
    const { arg, argValues, skipRender } = dataArg;
    const { argType, expressionIndex } = passedProps;

    // TODO: show some information to the user than an argument was skipped
    if (!arg || skipRender) return null;

    // If value in expression, render the argument's template, wrapped in a remove control
    if (!argValues && arg.required) {
      return arg.render({
        key: `${argType}-${expressionIndex}-${arg.name}-0`,
        ...passedProps,
        valueIndex: 0,
        argValue: { type: undefined, value: '' },
        onValueChange: onValueChange(arg.name, 0),
        onValueRemove: onValueRemove(arg.name, 0),
      });
    }

    return argValues && argValues.map((argValue, valueIndex) =>
      arg.render({
        key: `${argType}-${expressionIndex}-${arg.name}-${valueIndex}`,
        ...passedProps,
        valueIndex,
        argValue,
        onValueChange: onValueChange(arg.name, valueIndex),
        onValueRemove: onValueRemove(arg.name, valueIndex),
      })
    );
  }

  renderAddArg(props, dataArg) {
    const { onValueAdd } = props;
    const { arg, argValues, skipRender } = dataArg;

    // skip arguments that aren't defined in the expression type schema
    if (arg.required || !arg || skipRender) return null;

    const newArgValue = fromExpression(arg.defaultValue) || { type: 'string', value: '' };

    return (!argValues || arg.multi) && (
      <ArgAdd key={`${props.typeInstance.name}-${arg.name}-add`}
        displayName={arg.displayName}
        onValueAdd={onValueAdd(arg.name, newArgValue)}
      />
    );
  }

  resolveArg() {
    // basically a no-op placeholder
    return {};
  }

  render(data = {}) {
    const { args } = data;

    if (!isPlainObject(args)) {
      throw new Error(`Form "${this.name}" expects "args" object`);
    }

    // get a mapping of arg values from the expression and from the renderable's schema
    const argNames = uniq(this.args.map(arg => arg.name).concat(Object.keys(args)));
    const dataArgs = argNames.map(argName => {
      const arg = this.args.find(arg => arg.name === argName);

      // if arg is not multi, only preserve the last value found
      // otherwise, leave the value alone (including if the arg is not defined)
      const isMulti = arg && arg.multi;
      const argValues = args[argName] && !isMulti ? [last(args[argName])] : args[argName];

      return { arg, argValues };
    });

    // props are passed to resolve and the returned object is mixed into the template props
    const props = { ...data, ...this.resolve(data), typeInstance: this };

    try {
      // allow a hook to override the data args
      const resolvedDataArgs = dataArgs.map(d => ({ ...d, ...this.resolveArg(d, props) }));

      const argumentForms = resolvedDataArgs.map(d => this.renderArg(props, d));
      const addForms = resolvedDataArgs.map(d => this.renderAddArg(props, d)); // Buttons for adding more arguments

      return (
        <div>
          {argumentForms}
          {addForms}
        </div>
      );

    } catch (e) {
      return (<Alert bsStyle="danger">
        <h4>Expression rendering error</h4>
        {e.message}
      </Alert>);
    }
  }
}
