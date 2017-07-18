import React, { createElement } from 'react';
import { pick } from 'lodash';

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

  render(props = {}) {
    return createElement(this.template, { ...props, ...this.resolve(props) });
  }
}
