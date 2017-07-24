import React from 'react';
import { Registry } from '../../common/lib/registry';
import { BaseForm } from './base_form';

const defaultTemplate = () => (
  <div>
    <p>This datasource has not interface. Use the expression editor to make changes.</p>
  </div>
);

export class Datasource extends BaseForm {
  constructor(name, props) {
    super(name, {
      template: defaultTemplate,
      ...props,
    });

    this.image = props.image;
  }
}

export const datasourceRegistry = new Registry();
