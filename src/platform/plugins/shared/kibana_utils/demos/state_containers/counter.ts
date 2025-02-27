/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStateContainer } from '../../common/state_containers';

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

console.log(container.selectors.count()); // eslint-disable-line no-console

export const result = container.selectors.count();
