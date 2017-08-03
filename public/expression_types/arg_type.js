import React from 'react';
import { Registry } from '../../common/lib/registry';
import { BaseForm } from './base_form';

const defaultTemplate = (p = {}) => (<pre>{ JSON.stringify(p, null, 2) }</pre>);

export class ArgType extends BaseForm {
  constructor(name, props) {
    super(name, props);

    this.template = props.template || defaultTemplate;
  }
}

export const argTypeRegistry = new Registry();
