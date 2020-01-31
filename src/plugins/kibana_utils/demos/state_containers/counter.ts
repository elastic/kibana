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

import { createStateContainer } from '../../public/state_containers';

interface State {
  count: number;
}

const container = createStateContainer(
  { count: 0 },
  {
    increment: (state: State) => (by: number) => ({ count: state.count + by }),
    double: (state: State) => () => ({ count: state.count * 2 }),
  },
  {
    count: (state: State) => () => state.count,
  }
);

container.transitions.increment(5);
container.transitions.double();

console.log(container.selectors.count()); // eslint-disable-line

export const result = container.selectors.count();
