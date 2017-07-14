import React, { createElement } from 'react';
import { Registry } from '../../common/lib/registry';
import { BaseRenderable } from './base_renderable';

const defaultTemplate = () => (
  <div>
    <p>This datasource has not interface. Use the expression editor to make changes.</p>
  </div>
);

export class Datasource extends BaseRenderable {
  constructor(name, props) {
    super(name, {
      template: defaultTemplate,
      ...props,
    });
  }

  render(props = {}) {
    return createElement(this.template, props);
  }
}

export const datasourceRegistry = new Registry();
