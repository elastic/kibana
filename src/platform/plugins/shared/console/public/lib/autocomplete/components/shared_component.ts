/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AutocompleteComponent } from './autocomplete_component';
export class SharedComponent extends AutocompleteComponent {
  _nextDict: Record<string, SharedComponent[]>;
  _parent?: SharedComponent;

  constructor(name: string, parent?: SharedComponent) {
    super(name);
    this._nextDict = {};
    if (parent) {
      parent.addComponent(this);
    }
    // for debugging purposes
    this._parent = parent;
  }
  /* return the first component with a given name */
  getComponent(name: string): SharedComponent | undefined {
    return (this._nextDict[name] ?? [])[0];
  }

  addComponent(component: SharedComponent): void {
    const current = this._nextDict[component.name] || [];
    current.push(component);
    this._nextDict[component.name] = current;
    this.next = Object.values(this._nextDict).reduce<AutocompleteComponent[]>(
      (acc, list) => acc.concat(list),
      []
    );
  }
}
