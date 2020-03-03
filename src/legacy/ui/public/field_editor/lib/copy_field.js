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

import { has } from 'lodash';

/**
 * Fully clones a Field object, so that modifications can be performed on
 * the copy without affecting original field. Field objects contain
 * enumerable and non-eumerable properties that may or may not be writable.
 * The function copies all properties as property descriptors into
 * `newFieldProps`, overrides getter and setter, and returns a new object
 * created from that.
 *
 * @param {object} field - Field object to copy
 * @param {object} indexPattern - index pattern object the field belongs to
 * @param {object} Field - Field object type
 * @return {object} the cloned object
 */
export const copyField = (field, indexPattern, Field) => {
  const changes = {};
  const newFieldProps = {
    // When we are ready to save the copied field back into the index pattern,
    // we use `toActualField()` to retrieve an actual `Field` type object, using
    // its original properties with our "changes" applied.
    toActualField: {
      value: () => {
        return new Field(indexPattern, {
          ...field.$$spec,
          ...changes,
        });
      },
    },
  };

  // Index pattern `Field` objects are created with custom property
  // descriptors using `ObjDefine`.
  //
  // Each property of a `Field` type object could be enumerable/non-enumerable,
  // writable/not writable, configurable/not configurable, and have custom
  // getter and setter. We can't use the original `field` object directly for
  // creating a new field or editing a new field, since we need all the
  // properties to be editable.
  //
  // A normal copy of `field` (i.e. `const newField = { ...field }`) will only
  // copy enumerable properties and copy each property's descriptors (not
  // writable, etc).
  //
  // So we copy `field`'s **property descriptors** into `newFieldProps`
  // and modify them so that they are "writable" with a getter/setter that
  // stores and retrieves changes into/from another object (`changes`).
  Object.getOwnPropertyNames(field).forEach(function(prop) {
    const desc = Object.getOwnPropertyDescriptor(field, prop);

    newFieldProps[prop] = {
      enumerable: desc.enumerable,
      get: function() {
        return has(changes, prop) ? changes[prop] : field[prop];
      },
      set: function(v) {
        changes[prop] = v;
      },
    };
  });

  return Object.create(null, newFieldProps);
};
