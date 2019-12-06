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

export class AndSavedObjectsPredicates implements ISavedObjectsPredicate {
  constructor(
    public readonly predicates: ISavedObjectsPredicate[],
    private readonly error?: Error
  ) {}

  exec(obj: any): ISavedObjectsPredicateExecResult {
    const predicateResults = this.predicates.map(predicate => predicate.exec(obj));
    const isValid = predicateResults.every(result => result.isValid);
    if (isValid) {
      return {
        isValid,
      };
    }

    // When we have an AND predicate, if any of the predicates themselves have an explicit
    // error and they're false, we can use the first one's error. There might be other errors,
    // but we can only use one of their status codes, so we're just going to use the first. Otherwise,
    // we have to figure out how to "combine" errors, and that seems complicated
    const invalidPredicateResultWithError = predicateResults.find(
      result => result.isValid === false && result.error
    );
    return {
      isValid,
      error: this.error
        ? this.error
        : invalidPredicateResultWithError && invalidPredicateResultWithError.error,
    };
  }

  getQuery(type: string): Record<string, any> {
    return {
      bool: {
        must: [this.predicates.map(predicate => predicate.getQuery(type))],
      },
    };
  }
}
