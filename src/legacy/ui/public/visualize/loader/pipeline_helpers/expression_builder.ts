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
 * Simple chainable class for building expression strings. Handles the overhead of
 * checking for undefined args, escaping strings & JSON, and adding spaces & pipes.
 *
 * @example
 *
 * const exp = new ExpressionBuilder();
 * exp.addFn('kibana');
 *
 * exp.addFn('tagcloud')
 *   .addArg('metric', '{ vis_dimension 1 }') // works when given a subexpression as a string
 *   .addArg('visConfig', { foo: 'bar' }); // will handle stringifying & escaping objects
 *
 * exp.printFn('tagcloud'); // "tagcloud metric={ vis_dimension 1 } visConfig='{ foo: \'bar\' }'"
 *
 * exp.addFn('render')
 *   addArg('baz', '"hello"');
 *
 * exp.print(); // "kibana | tagcloud metric={ vis_dimension 1 } visConfig='{ foo: \'bar\' }' | render baz='\"hello\""'"
 */
export class ExpressionBuilder {
  private fns: Map<string, { [key: string]: string }> = new Map();
  private currFn: string | null = null;

  public selectFn(name: string) {
    this.currFn = name;
    return this;
  }

  public addFn(name: string) {
    this.fns.set(name, {});
    this.selectFn(name);
    return this;
  }

  public removeFn(name: string) {
    if (this.fns.has(name)) {
      this.fns.delete(name);
    }
    return this;
  }

  public addArg(name: string, data: string | object | undefined) {
    if (this.currFn && data) {
      const fn = this.fns.get(this.currFn);
      if (fn) {
        fn[name] = this.prepareData(data);
      }
    }
    return this;
  }

  public removeArg(name: string) {
    if (this.currFn) {
      const fn = this.fns.get(this.currFn);
      if (fn) {
        delete fn[name];
      }
    }
    return this;
  }

  public printFn(fnName: string): string {
    const fn = this.fns.get(fnName);
    let str = '';
    if (fn) {
      str += fnName;
      Object.keys(fn).forEach(argName => {
        str += ` ${this.printFnArg(fnName, argName)}`;
      });
    }
    return str;
  }

  public print() {
    let str = '';
    Array.from(this.fns.keys()).forEach((fn, i) => {
      if (i !== 0) {
        str += ` | `;
      }
      str += this.printFn(fn);
    });
    return str;
  }

  public clear() {
    this.fns.clear();
    this.currFn = null;
    return this;
  }

  private printFnArg(fnName: string, argName: string) {
    const fn = this.fns.get(fnName);
    if (!fn || !fn[argName]) {
      return;
    }
    return `${argName}=${fn[argName]}`;
  }

  private prepareData(data: string | object) {
    if (typeof data === 'object') {
      return this.escapeString(JSON.stringify(data));
    }
    return this.escapeString(data);
  }

  private escapeString(data: string) {
    return `'${data.replace(/\\/g, `\\\\`).replace(/'/g, `\\'`)}'`;
  }
}
