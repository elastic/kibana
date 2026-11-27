/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findEuiComponentName } from './find_eui_component_name';
import type { ReactFiberNode } from './types';

describe('findEuiComponentName', () => {
  const table: ReactFiberNode = { type: { displayName: 'EuiTable' } };
  const user: ReactFiberNode = { type: { name: 'UserComponent' }, _debugOwner: table };
  const button: ReactFiberNode = { type: { displayName: 'EuiButtonDisplay' }, _debugOwner: user };
  const host: ReactFiberNode = { type: 'button', _debugOwner: button };

  it('should return the closest EUI component', () => {
    expect(findEuiComponentName(host)).toBe('EuiButtonDisplay');
  });

  it('should only consider candidates accepted by the filter', () => {
    expect(findEuiComponentName(host, (name) => name === 'EuiTable')).toBe('EuiTable');
  });

  it('should return null when no EUI component is found', () => {
    expect(
      findEuiComponentName({ type: 'div', _debugOwner: { type: { name: 'App' } } })
    ).toBeNull();
  });
});
