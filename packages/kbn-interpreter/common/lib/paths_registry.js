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

import clone from 'lodash.clone';

class PathsRegistry {
  constructor() {
    this._paths = {};
  }

  register = (type, paths) => {
    if (!type) throw new Error(`Register requires a type`);
    const lowerCaseType = type.toLowerCase();

    const pathArray = Array.isArray(paths) ? paths : [paths];
    if (!this._paths[lowerCaseType]) {
      this._paths[lowerCaseType] = [];
    }

    pathArray.forEach(p => {
      this._paths[lowerCaseType].push(p);
    });
  };

  registerAll = (paths) => {
    Object.keys(paths).forEach(key => {
      this.register(key, paths[key]);
    });
  };

  toJS = () => {
    return Object.keys(this._paths).reduce((acc, key) => {
      acc[key] = this.get(key);
      return acc;
    }, {});
  };

  toArray = () => {
    return Object.keys(this._paths).map(key => this.get(key));
  };

  get = (type) => {
    if (type === undefined) return [];
    const lowerCaseType = type.toLowerCase();
    return this._paths[lowerCaseType] ? clone(this._paths[lowerCaseType]) : [];
  };

  reset = () => {
    this._paths = {};
  };
}

export const pathsRegistry = new PathsRegistry();
