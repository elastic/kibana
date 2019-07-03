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
import { clone, mapValues, includes } from 'lodash';
import { Type } from '../../common/expressions/interpreter';
import { ExpressionType } from '../../common/expressions/types';

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

export function Arg(this: any, config: any) {
  if (config.name === '_') throw Error('Arg names must not be _. Use it in aliases instead.');
  this.name = config.name;
  this.required = config.required || false;
  this.help = config.help || '';
  this.types = config.types || [];
  this.default = config.default;
  this.aliases = config.aliases || [];
  this.multi = config.multi == null ? false : config.multi;
  this.resolve = config.resolve == null ? true : config.resolve;
  this.options = config.options || [];
  this.accepts = (type: any) => {
    if (!this.types.length) return true;
    return includes(config.types, type);
  };
}

export function Fn(this: any, config: any) {
  // Required
  this.name = config.name; // Name of function

  // Return type of function.
  // This SHOULD be supplied. We use it for UI and autocomplete hinting,
  // We may also use it for optimizations in the future.
  this.type = config.type;
  this.aliases = config.aliases || [];

  // Function to run function (context, args)
  this.fn = (...args: any) => Promise.resolve(config.fn(...args));

  // Optional
  this.help = config.help || ''; // A short help text
  this.args = mapValues(
    config.args || {},
    (arg: any, name: any) => new (Arg as any)({ name, ...arg })
  );

  this.context = config.context || {};

  this.accepts = (type: any) => {
    if (!this.context.types) return true; // If you don't tell us about context, we'll assume you don't care what you get
    return includes(this.context.types, type); // Otherwise, check it
  };
}

export class RenderFunctionsRegistry extends Registry<any, any> {
  wrapper(obj: any) {
    return new (RenderFunction as any)(obj);
  }
}

export class FunctionsRegistry extends Registry<any, any> {
  wrapper(obj: any) {
    return new (Fn as any)(obj);
  }
}

export class TypesRegistry extends Registry<ExpressionType<any, any>, any> {
  wrapper(obj: any) {
    return new (Type as any)(obj);
  }
}
