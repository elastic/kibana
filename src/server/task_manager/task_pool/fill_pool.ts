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

type BatchRun<T> = (tasks: T[]) => Promise<boolean>;
type Fetcher<T> = () => Promise<T[]>;
type Converter<T1, T2> = (t: T1) => T2;

/**
 * Given a function that runs a batch of tasks (e.g. taskPool.run), a function
 * that fetches task records (e.g. store.fetchAvailableTasks), and a function
 * that converts task records to the appropriate task runner, this function
 * fills the pool with work.
 *
 * This is annoyingly general in order to simplify testing.
 *
 * @param run - a function that runs a batch of tasks (e.g. taskPool.run)
 * @param fetchAvailableTasks - a function that fetches task records (e.g. store.fetchAvailableTasks)
 * @param converter - a function that converts task records to the appropriate task runner
 */
export async function fillPool<TRecord, TRunner>(
  run: BatchRun<TRunner>,
  fetchAvailableTasks: Fetcher<TRecord>,
  converter: Converter<TRecord, TRunner>
) {
  while (true) {
    const instances = await fetchAvailableTasks();

    if (!instances.length) {
      return;
    }

    const tasks = instances.map(converter);

    if (!(await run(tasks))) {
      return;
    }
  }
}
