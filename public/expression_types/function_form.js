import React from 'react';
import { Label, Alert } from 'react-bootstrap';
import { isPlainObject, uniq, last } from 'lodash';
import { BaseForm } from './base_form';
import { fromExpression } from '../../common/lib/ast';
import { ArgForm } from '../components/arg_form';

export class FunctionForm extends BaseForm {
  renderArg(props, dataArg) {
    const { onValueRemove, onValueChange, ...passedProps } = props;
    const { arg, argValues, skipRender } = dataArg;

    // TODO: show some information to the user than an argument was skipped
    if (!arg || skipRender) return null;

    // If value in expression, render the argument's template, wrapped in a remove control
    return argValues && argValues.map((argValue, valueIndex) => (
      <ArgForm
        {...passedProps}
        arg={arg}
        valueIndex={valueIndex}
        argValue={argValue}
        onValueChange={onValueChange(arg.name, valueIndex)}
        onValueRemove={onValueRemove(arg.name, valueIndex)}
      />
    ));
  }

  renderAddArg(props, dataArg) {
    const { onValueAdd } = props;
    const { arg, argValues } = dataArg;

    // skip arguments that aren't defined in the expression type schema
    if (!arg) return null;

    const newArgValue = fromExpression(arg.defaultValue) || { type: 'string', value: '' };

    // if no value in expression, render the add control
    // TODO: pass in the value when adding arguments, likely using some default defined in the type config
    return (!argValues || arg.multi) && (
      <div className="canvas__function__arg--add" key={`${props.typeInstance.name}-${arg.name}-add`}>
        <Label bsStyle="default" onClick={onValueAdd(arg.name, newArgValue)}>
          + {arg.displayName}
        </Label>
      </div>
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
      return resolvedDataArgs
        .map(d => this.renderArg(props, d)) // Argument forms
        .concat(resolvedDataArgs.map(d => this.renderAddArg(props, d))); // Buttons for adding more arguments
    } catch (e) {
      return (<Alert bsStyle="danger">
        <h4>Expression rendering error</h4>
        {e.message}
      </Alert>);
    }
  }
}
