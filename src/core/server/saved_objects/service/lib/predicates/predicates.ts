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
import { ISavedObjectsPredicate } from './predicate';

export type SavedObjectsPredicatesOperator = 'AND' | 'OR';

export class SavedObjectsPredicates implements ISavedObjectsPredicate {
  constructor(
    public readonly operator: SavedObjectsPredicatesOperator,
    public readonly predicates: ISavedObjectsPredicate[]
  ) {}

  exec(obj: any): boolean {
    switch (this.operator) {
      case 'AND':
        return this.predicates.every(predicate => predicate.exec(obj));
      case 'OR':
        return this.predicates.some(predicate => predicate.exec(obj));
    }
  }

  getQuery(type: string): Record<string, any> {
    switch (this.operator) {
      case 'AND':
        return {
          bool: {
            must: [this.predicates.map(predicate => predicate.getQuery(type))],
          },
        };
      case 'OR':
        return {
          bool: {
            should: [this.predicates.map(predicate => predicate.getQuery(type))],
            minimum_should_match: 1,
          },
        };
    }
  }
}
