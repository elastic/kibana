/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import _ from 'lodash';
import { ConstantComponent, ListComponent, SharedComponent } from './components';
import type { AutocompleteComponent } from './components/autocomplete_component';
import type { ResultTerm } from './types';

export class ParamComponent extends ConstantComponent {
  private readonly description: UrlParamValue;

  constructor(name: string, parent: SharedComponent, description: UrlParamValue) {
    super(name, parent);
    this.description = description;
  }
  getTerms() {
    const t: ResultTerm = { name: this.name };
    if (this.description === '__flag__') {
      t.meta = 'flag';
    } else {
      t.meta = 'param';
      t.insertValue = this.name + '=';
    }
    return [t];
  }
}

type UrlParamValue = '__flag__' | string[] | string;
type UrlParamsDescription = Record<string, UrlParamValue>;

export class UrlParams {
  private readonly rootComponent: SharedComponent;

  constructor(description?: UrlParamsDescription, defaults?: UrlParamsDescription) {
    // This is not really a component, just a handy container to make iteration logic simpler
    this.rootComponent = new SharedComponent('ROOT');
    if (_.isUndefined(defaults)) {
      defaults = {
        pretty: '__flag__',
        format: ['json', 'yaml'],
        filter_path: '',
      };
    }
    const mergedDescription: UrlParamsDescription = _.clone(description || {});
    _.defaults(mergedDescription, defaults);
    _.each(mergedDescription, (pDescription, param) => {
      const component = new ParamComponent(param, this.rootComponent, pDescription);
      if (Array.isArray(pDescription)) {
        new ListComponent(param, pDescription, component);
      } else if (pDescription === '__flag__') {
        new ListComponent(param, ['true', 'false'], component);
      }
    });
  }
  getTopLevelComponents(): AutocompleteComponent[] {
    return this.rootComponent.next ?? [];
  }
}
