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

/*
 * This is the core logic for validating saved object properties. The saved object client
 * and migrations consume this in order to validate saved object documents prior to
 * persisting them.
 */

interface SavedObjectDoc {
  type: string;
  [prop: string]: any;
}

/**
 * A dictionary of property name -> validation function. The property name
 * is generally the document's type (e.g. "dashboard"), but will also
 * match other properties.
 *
 * For example, the "acl" and "dashboard" validators both apply to the
 * following saved object: { type: "dashboard", attributes: {}, acl: "sdlaj3w" }
 *
 * @export
 * @interface Validators
 */
export interface PropertyValidators {
  [prop: string]: ValidateDoc;
}

export type ValidateDoc = (doc: SavedObjectDoc) => void;

/**
 * Creates a function which uses a dictionary of property validators to validate
 * individual saved object documents.
 *
 * @export
 * @param {Validators} validators
 * @param {SavedObjectDoc} doc
 */
export function docValidator(validators: PropertyValidators = {}): ValidateDoc {
  return function validateDoc(doc: SavedObjectDoc) {
    Object.keys(doc)
      .concat(doc.type)
      .forEach((prop) => {
        const validator = validators[prop];
        if (validator) {
          validator(doc);
        }
      });
  };
}
