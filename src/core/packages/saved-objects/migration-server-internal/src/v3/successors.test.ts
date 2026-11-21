/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StateName } from './state';
import { STEPS, SUCCESSORS } from './successors';

const successorsOf = (name: StateName): readonly StateName[] => SUCCESSORS[name];
const stateNames = Object.keys(SUCCESSORS) as StateName[];

/** The states reachable from `start`, `start` included. */
const reachableFrom = (start: StateName, edges: (name: StateName) => readonly StateName[]) => {
  const visit = (visited: Set<StateName>, name: StateName): Set<StateName> =>
    visited.has(name) ? visited : edges(name).reduce(visit, new Set([...visited, name]));
  return visit(new Set(), start);
};

describe('SUCCESSORS', () => {
  it('only lists known states', () => {
    stateNames.forEach((name) =>
      successorsOf(name).forEach((successor) => expect(stateNames).toContain(successor))
    );
  });

  it('reaches every state from INIT', () => {
    expect([...reachableFrom('INIT', successorsOf)].sort()).toEqual([...stateNames].sort());
  });

  it('allows every state to complete or fail', () => {
    stateNames.forEach((name) => {
      const reachable = reachableFrom(name, successorsOf);
      expect({ name, completes: reachable.has('DONE') || reachable.has('FATAL') }).toEqual({
        name,
        completes: true,
      });
    });
  });

  it('has a step for every non-terminal state, and none for terminal states', () => {
    const terminal = stateNames.filter((name) => successorsOf(name).length === 0);
    expect(terminal.sort()).toEqual(['DONE', 'FATAL']);
    expect(Object.keys(STEPS).sort()).toEqual(
      stateNames.filter((name) => !terminal.includes(name)).sort()
    );
  });

  it('matches the documented state graph', () => {
    expect(SUCCESSORS).toMatchSnapshot();
  });
});
