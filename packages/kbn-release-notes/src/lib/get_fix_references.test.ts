/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getFixReferences } from './get_fix_references';

it('returns all fixed issue mentions in the PR text', () => {
  expect(
    getFixReferences(`
      clOses #1
      closes: #2
      clOse #3
      close: #4
      clOsed #5
      closed: #6
      fiX #7
      fix: #8
      fiXes #9
      fixes: #10
      fiXed #11
      fixed: #12
      reSolve #13
      resolve: #14
      reSolves #15
      resolves: #16
      reSolved #17
      resolved: #18
      fixed
      #19
    `)
  ).toMatchInlineSnapshot(`
    Array [
      "#1",
      "#2",
      "#3",
      "#4",
      "#5",
      "#6",
      "#7",
      "#8",
      "#9",
      "#10",
      "#11",
      "#12",
      "#13",
      "#14",
      "#15",
      "#16",
      "#17",
      "#18",
    ]
  `);
});
