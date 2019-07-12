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

import { KbnError } from 'ui/errors';

/**
 * when a mapping already exists for a field the user is attempting to add
 * @param {String} name - the field name
 */
export class IndexPatternAlreadyExists extends KbnError {
  constructor(name) {
    super(
      `An index pattern of "${name}" already exists`,
      IndexPatternAlreadyExists);
  }
}

/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export class IndexPatternMissingIndices extends KbnError {
  constructor(message) {
    const defaultMessage = 'IndexPattern\'s configured pattern does not match any indices';

    super(
      (message && message.length) ? `No matching indices found: ${message}` : defaultMessage,
      IndexPatternMissingIndices);
  }
}

/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export class NoDefinedIndexPatterns extends KbnError {
  constructor() {
    super(
      'Define at least one index pattern to continue',
      NoDefinedIndexPatterns);
  }
}

/**
 * Tried to load a route besides management/kibana/index but you don't have a default index pattern!
 */
export class NoDefaultIndexPattern extends KbnError {
  constructor() {
    super(
      'Please specify a default index pattern',
      NoDefaultIndexPattern);
  }
}
