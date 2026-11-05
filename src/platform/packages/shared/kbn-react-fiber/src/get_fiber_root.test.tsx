/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { getFiberFromElement } from './get_fiber_from_element';
import { getFiberRoot } from './get_fiber_root';
import { isLegacyRoot } from './predicates';

const renderIntoRoot = (legacyRoot: boolean) => {
  const { container, getByText } = render(<span>Save</span>, { legacyRoot });
  const fiber = getFiberFromElement(getByText('Save'));

  return { container, root: fiber && getFiberRoot(fiber) };
};

describe('getFiberRoot', () => {
  it('should return the root created with `createRoot` an element was rendered into', () => {
    const { container, root } = renderIntoRoot(false);

    expect(root?.containerInfo).toBe(container);
    expect(root && isLegacyRoot(root)).toBe(false);
  });

  it('should return the root created with `ReactDOM.render` an element was rendered into', () => {
    // React 18 warns about the deprecation of `ReactDOM.render` on every call
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container, root } = renderIntoRoot(true);
    consoleError.mockRestore();

    expect(root?.containerInfo).toBe(container);
    expect(root && isLegacyRoot(root)).toBe(true);
  });

  it('should return null for a fiber that is no longer attached to a tree', () => {
    expect(getFiberRoot({ type: 'span', return: { type: 'div' } })).toBeNull();
  });
});
