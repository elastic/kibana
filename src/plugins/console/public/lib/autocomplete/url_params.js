/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { ConstantComponent, ListComponent, SharedComponent } from './components';

export class ParamComponent extends ConstantComponent {
  constructor(name, parent, description) {
    super(name, parent);
    this.description = description;
  }
  getTerms() {
    const t = { name: this.name };
    if (this.description === '__flag__') {
      t.meta = 'flag';
    } else {
      t.meta = 'param';
      t.insertValue = this.name + '=';
    }
    return [t];
  }
}

export class UrlParams {
  constructor(description, defaults) {
    // This is not really a component, just a handy container to make iteration logic simpler
    this.rootComponent = new SharedComponent('ROOT');
    if (_.isUndefined(defaults)) {
      defaults = {
        pretty: '__flag__',
        format: ['json', 'yaml'],
        filter_path: '',
      };
    }
    description = _.clone(description || {});
    _.defaults(description, defaults);
    _.each(description, (pDescription, param) => {
      const component = new ParamComponent(param, this.rootComponent, pDescription);
      if (Array.isArray(pDescription)) {
        new ListComponent(param, pDescription, component);
      } else if (pDescription === '__flag__') {
        new ListComponent(param, ['true', 'false'], component);
      }
    });
  }
  getTopLevelComponents() {
    return this.rootComponent.next;
  }
}
