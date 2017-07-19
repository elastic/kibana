import React from 'react';
import { Label } from 'react-bootstrap';
import { BaseRenderable } from './base_renderable';
import { isPlainObject, uniq } from 'lodash';

export class ArgRenderable extends BaseRenderable {
  renderArg(props, dataArg) {
    const { arg, argName, argValue, skipRender } = dataArg;
    const { onValueRemove, onValueAdd, ...passedProps } = props;

    // TODO: show some information to the user than an argument was skipped
    if (!arg || skipRender) return null;

    // Render the argument's template, wrapped in a remove control
    return (
      <div key={`${props.typeInstance.name}-${arg.name}`}>
        { (!argValue) ? (
          <div className="canvas__argtype__add" >
            <Label bsStyle="default" onClick={() => onValueAdd(argName)}>
              + {arg.displayName}
            </Label>
          </div>
        ) : (
          <div className="canvas__argtype__arg" >
            <div className="canvas__argtype__arg--controls">{ arg.render({ ...passedProps, argValue }) }</div>
            <div className="canvas__argtype__arg--remove" onClick={() => onValueRemove(argName)}>
              <i className="fa fa-trash-o" />
            </div>
          </div>
        )}
      </div>
    );
  }

  renderArgs(props, dataArgs) {
    return dataArgs.map(dataArg => this.renderArg(props, dataArg));
  }

  render(data = {}) {
    const { args } = data;

    if (!isPlainObject(args)) {
      throw new Error(`Renderable "${this.name}" expects "args" object`);
    }

    // get a mapping of the expression arg values and matching arg definitions
    const argNames = uniq(Object.keys(args).concat(this.args.map(arg => arg.name)));
    const dataArgs = argNames.map(argName => ({
      argName,
      argValue: args[argName],
      arg: this.args.find(arg => arg.name === argName),
    }))
    .sort(arg => arg.argValue ? 0 : 1); // put args missing a value at the end of the array

    // props are passed to resolve and the returned object is mixed into the template props
    return this.renderArgs({ ...data, ...this.resolve(data), typeInstance: this }, dataArgs);
  }
}
