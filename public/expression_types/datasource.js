import React from 'react';
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
}

export const datasourceRegistry = new Registry();
