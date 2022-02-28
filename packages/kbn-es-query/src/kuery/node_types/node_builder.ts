/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { and, exists, is, nested, not, or, range } from '../functions';

export const nodeBuilder = {
  and: and.buildNode,
  exists: exists.buildNode,
  is: is.buildNode,
  nested: nested.buildNode,
  not: not.buildNode,
  or: or.buildNode,
  range: range.buildNode,
};
