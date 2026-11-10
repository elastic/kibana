/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOwnerChain } from './get_owner_chain';
import type { ReactFiberNode } from './types';

describe('getOwnerChain', () => {
  it('should list the fiber followed by its owners, falling back to the parent without an owner', () => {
    const root: ReactFiberNode = { type: { name: 'App' } };
    const staticElement: ReactFiberNode = { type: 'span', _debugOwner: null, return: root };
    const owner: ReactFiberNode = { type: { name: 'Panel' }, return: staticElement };
    const leaf: ReactFiberNode = { type: 'div', _debugOwner: owner };

    expect(getOwnerChain(leaf)).toEqual([leaf, owner, staticElement, root]);
  });
});
