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
import { Ast } from '@kbn/interpreter/src/common';
import { get } from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Fn, getType } = require('@kbn/interpreter/src/common');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { clone } = require('lodash');

export { Ast };

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

function Type(this: any, config: any) {
  // Required
  this.name = config.name;

  // Optional
  this.help = config.help || ''; // A short help text

  // Optional type validation, useful for checking function output
  this.validate = config.validate || function validate() {};

  // Optional
  this.create = config.create;

  // Optional serialization (used when passing context around client/server)
  this.serialize = config.serialize;
  this.deserialize = config.deserialize;

  const getToFn = (type: any) => get(config, ['to', type]) || get(config, ['to', '*']);
  const getFromFn = (type: any) => get(config, ['from', type]) || get(config, ['from', '*']);

  this.castsTo = (type: any) => typeof getToFn(type) === 'function';
  this.castsFrom = (type: any) => typeof getFromFn(type) === 'function';

  this.to = (node: any, toTypeName: any, types: any) => {
    const typeName = getType(node);
    if (typeName !== this.name) {
      throw new Error(`Can not cast object of type '${typeName}' using '${this.name}'`);
    } else if (!this.castsTo(toTypeName)) {
      throw new Error(`Can not cast '${typeName}' to '${toTypeName}'`);
    }

    return (getToFn(toTypeName) as any)(node, types);
  };

  this.from = (node: any, types: any) => {
    const typeName = getType(node);
    if (!this.castsFrom(typeName)) throw new Error(`Can not cast '${this.name}' from ${typeName}`);

    return (getFromFn(typeName) as any)(node, types);
  };
}

export class RenderFunctionsRegistry extends Registry<any, any> {
  wrapper(obj: any) {
    return new (RenderFunction as any)(obj);
  }
}

export class FunctionsRegistry extends Registry<any, any> {
  wrapper(obj: any) {
    return new Fn(obj);
  }
}

export class TypesRegistry extends Registry<any, any> {
  wrapper(obj: any) {
    return new (Type as any)(obj);
  }
}
