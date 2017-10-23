import React, { createElement } from 'react';
import { Registry } from '../../common/lib/registry';
import { BaseForm } from './base_form';

const defaultTemplate = () => (
  <div>
    <p>This datasource has no interface. Use the expression editor to make changes.</p>
  </div>
);

export class Datasource extends BaseForm {
  constructor(props) {
    super(props);

    this.template = props.template || defaultTemplate;
    this.image = props.image;
  }

  render(props = {}) {
    return createElement(this.template, props);
  }
}

class DatasourceRegistry extends Registry {
  wrapper(obj) {
    return new Datasource(obj);
  }
}

export const datasourceRegistry = new DatasourceRegistry();
