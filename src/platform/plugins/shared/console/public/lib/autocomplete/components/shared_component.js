/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { AutocompleteComponent } from './autocomplete_component';
export class SharedComponent extends AutocompleteComponent {
  constructor(name, parent) {
    super(name);
    this._nextDict = {};
    if (parent) {
      parent.addComponent(this);
    }
    // for debugging purposes
    this._parent = parent;
  }
  /* return the first component with a given name */
  getComponent(name) {
    return (this._nextDict[name] || [undefined])[0];
  }

  addComponent(component) {
    const current = this._nextDict[component.name] || [];
    current.push(component);
    this._nextDict[component.name] = current;
    this.next = [].concat.apply([], _.values(this._nextDict));
  }
}
