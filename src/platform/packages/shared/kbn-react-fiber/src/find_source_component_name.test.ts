/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findSourceComponentName } from './find_source_component_name';
import type { ReactFiberNode } from './types';

describe('findSourceComponentName', () => {
  it('should skip host elements and EUI components on the way up', () => {
    const user: ReactFiberNode = { type: { name: 'UserComponent' } };
    const eui: ReactFiberNode = { type: { displayName: 'EuiButton' }, _debugOwner: user };
    const host: ReactFiberNode = { type: 'button', _debugOwner: eui };

    expect(findSourceComponentName(host)).toBe('UserComponent');
  });

  it('should return the fiber itself when it is an application component', () => {
    expect(findSourceComponentName({ type: { name: 'UserComponent' } })).toBe('UserComponent');
  });

  it('should return null when only host elements are found', () => {
    expect(findSourceComponentName({ type: 'div', _debugOwner: { type: 'section' } })).toBeNull();
  });
});
