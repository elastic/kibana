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
import { ISavedObjectsPredicate, ISavedObjectsPredicateExecResult } from './predicate';

export class OrSavedObjectsPredicates implements ISavedObjectsPredicate {
  constructor(
    public readonly predicates: ISavedObjectsPredicate[],
    private readonly error?: Error
  ) {}

  exec(obj: any): ISavedObjectsPredicateExecResult {
    const predicateResults = this.predicates.map(predicate => predicate.exec(obj));
    const isValid = predicateResults.some(result => result.isValid);
    if (isValid) {
      return {
        isValid,
      };
    }

    // When we have an OR predicate, we can't use any of the predicate's errors because
    // all of them failed and we'd have to figure out how to combine errors... Instead, if
    // a consumer is using an OR predicate, they should explicit specify an error at this level
    // if they want it to be used.
    return {
      isValid,
      error: this.error,
    };
  }

  getQuery(type: string): Record<string, any> {
    return {
      bool: {
        should: [this.predicates.map(predicate => predicate.getQuery(type))],
        minimum_should_match: 1,
      },
    };
  }
}
