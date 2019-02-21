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

export abstract class Migrator<S> {
  public readonly id: string;
  // determines order of execution of migrators;
  constructor({ id }: { id: string }) {
    this.id = id;
  }
  public abstract migrate(input: S): S;
}

export function migrateState<I>(input: I, migrators: { [key: string]: Migrator<I> }) {
  const ret = Object.values(migrators).reduce((acc: I, migrator: Migrator<I>) => {
    const post = migrator.migrate(acc);
    return post;
  }, input);
  return ret;
}
