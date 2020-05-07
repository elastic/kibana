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

// create a property descriptor for properties
// that won't change
function describeConst(val) {
  return {
    writable: false,
    enumerable: false,
    configurable: false,
    value: val,
  };
}

const props = {
  inherits: describeConst(function(SuperClass) {
    const prototype = Object.create(SuperClass.prototype, {
      constructor: describeConst(this),
      superConstructor: describeConst(SuperClass),
    });

    Object.defineProperties(this, {
      prototype: describeConst(prototype),
      Super: describeConst(SuperClass),
    });

    return this;
  }),
};

/**
 * Add class-related behavior to a function, currently this
 * only attaches an .inherits() method.
 *
 * @param  {Constructor} ClassConstructor - The function that should be extended
 * @return {Constructor} - the constructor passed in;
 */
export function createLegacyClass(ClassConstructor) {
  return Object.defineProperties(ClassConstructor, props);
}
