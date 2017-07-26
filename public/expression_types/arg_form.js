import React from 'react';
import { Label, Alert } from 'react-bootstrap';
import { BaseForm } from './base_form';
import { isPlainObject, uniq, last } from 'lodash';

export class ArgForm extends BaseForm {
  renderArg(props, dataArg) {
    const { onValueRemove, ...passedProps } = props;
    const { arg, argValues, skipRender } = dataArg;

    // TODO: show some information to the user than an argument was skipped
    if (!arg || skipRender) return null;

    // If value in expression, render the argument's template, wrapped in a remove control
    return argValues && argValues.map((argValue, valueIndex) => (
      <div className="canvas__argtype__arg" key={`${props.typeInstance.name}-${arg.name}-${valueIndex}`}>
        <div className="canvas__argtype__arg--controls">{ arg.render({ ...passedProps, argValue }) }</div>
        <div className="canvas__argtype__arg--remove" onClick={() => onValueRemove(arg.name, valueIndex)}>
          <i className="fa fa-trash-o" />
        </div>
      </div>
    ));
  }

  renderAddArg(props, dataArg) {
    const { onValueAdd } = props;
    const { arg, argValues } = dataArg;

    // skip arguments that aren't defined in the expression type schema
    if (!arg) return null;

    // if no value in expression, render the add control
    return (!argValues || arg.multi) && (
      <div className="canvas__argtype__add" key={`${props.typeInstance.name}-${arg.name}-add`}>
        <Label bsStyle="default" onClick={() => onValueAdd(arg.name)}>
          + {arg.displayName}
        </Label>
      </div>
    );
  }

  resolveArgs(dataArgs) {
    // basically a no-op placeholder
    return dataArgs;
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
      const isMulti = arg && arg.multi;
      const argValues = args[argName] && !isMulti ? [last(args[argName])] : args[argName];

      return { arg, argName, argValues };
    });

    // props are passed to resolve and the returned object is mixed into the template props
    const props = { ...data, ...this.resolve(data), typeInstance: this };

    try {
      // allow a hook to override the data args
      const resolvedDataArgs = this.resolveArgs(dataArgs, props);
      return resolvedDataArgs.map(d => this.renderArg(props, d)).concat(resolvedDataArgs.map(d => this.renderAddArg(props, d)));
    } catch (e) {
      return (<Alert bsStyle="danger">
        <h4>Expression rendering error</h4>
        {e.message}
      </Alert>);
    }
  }
}
