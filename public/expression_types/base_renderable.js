import React from 'react';
import { pick, isPlainObject } from 'lodash';

const defaultTemplate = (p = {}) => (<pre>{ JSON.stringify(p, null, 2) }</pre>);

export class BaseRenderable {
  constructor(name, props) {
    const propNames = ['args', 'template', 'resolve', 'description'];
    const defaults = {
      args: [],
      description: name,
      resolve: () => ({}),
      template: defaultTemplate,
    };

    this.name = name;
    this.displayName = props.displayName || name;
    Object.assign(this, defaults, pick(props, propNames));
  }

  renderArg({ data, resolvedData, typeInstance }, arg) {
    return arg.render({
      data: {
        ...data,
        argValue: data.args[arg.name],
      },
      resolvedData,
      typeInstance,
    });
  }

  renderArgs(props, args) {
    return args.map(arg => this.renderArg(props, arg));
  }

  render(data = {}) {
    const { args } = data;

    if (!isPlainObject(args)) {
      throw new Error(`Renderable "${this.name}" expects "args" object`);
    }

    // props are passed to resolve and the returned object is mixed into the template props
    return this.renderArgs({ data, resolvedData: this.resolve(data), typeInstance: this }, this.args);
  }
}
