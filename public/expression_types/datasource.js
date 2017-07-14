import { createElement } from 'react';
import { Registry } from '../../common/lib/registry';
import { BaseRenderable } from './base_renderable';

export class Datasource extends BaseRenderable {
  constructor(name, props) {
    super(name, props);
  }

  render(props = {}) {
    return createElement(this.template, props);
  }
}

export const datasourceRegistry = new Registry();
