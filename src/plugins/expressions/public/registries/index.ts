/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * @todo
 * This whole file needs major refactoring. `Registry` class does not do anything
 * useful. "Wrappers" like `RenderFunction` basically just set default props on the objects.
 */

/* eslint-disable max-classes-per-file */
import { clone, includes, mapValues } from 'lodash';
import { Type } from '../interpreter';
import { ExpressionType, AnyExpressionFunction } from '../types';

export class Registry<ItemSpec, Item> {
  _prop: string;
  _indexed: any;

  constructor(prop: string = 'name') {
    if (typeof prop !== 'string') throw new Error('Registry property name must be a string');
    this._prop = prop;
    this._indexed = new Object();
  }

  wrapper(obj: ItemSpec) {
    return obj;
  }

  register(fn: () => ItemSpec) {
    if (typeof fn !== 'function') throw new Error(`Register requires an function`);

    const obj = fn() as any;

    if (typeof obj !== 'object' || !obj[this._prop]) {
      throw new Error(`Registered functions must return an object with a ${this._prop} property`);
    }

    this._indexed[obj[this._prop].toLowerCase()] = this.wrapper(obj);
  }

  toJS(): Record<string, any> {
    return Object.keys(this._indexed).reduce(
      (acc, key) => {
        acc[key] = this.get(key);
        return acc;
      },
      {} as any
    );
  }

  toArray(): Item[] {
    return Object.keys(this._indexed).map(key => this.get(key)!);
  }

  get(name: string): Item | null {
    if (name === undefined) {
      return null;
    }
    const lowerCaseName = name.toLowerCase();
    return this._indexed[lowerCaseName] ? clone(this._indexed[lowerCaseName]) : null;
  }

  getProp(): string {
    return this._prop;
  }

  reset() {
    this._indexed = new Object();
  }
}

function RenderFunction(this: any, config: any) {
  // This must match the name of the function that is used to create the `type: render` object
  this.name = config.name;

  // Use this to set a more friendly name
  this.displayName = config.displayName || this.name;

  // A sentence or few about what this element does
  this.help = config.help;

  // used to validate the data before calling the render function
  this.validate = config.validate || function validate() {};

  // tell the renderer if the dom node should be reused, it's recreated each time by default
  this.reuseDomNode = Boolean(config.reuseDomNode);

  // the function called to render the data
  this.render =
    config.render ||
    function render(domNode: any, data: any, done: any) {
      done();
    };
}

export class RenderFunctionsRegistry extends Registry<any, any> {
  wrapper(obj: any) {
    return new (RenderFunction as any)(obj);
  }
}

export class TypesRegistry extends Registry<ExpressionType<any, any, any>, any> {
  wrapper(obj: any) {
    return new (Type as any)(obj);
  }
}

export * from './function_registry';
