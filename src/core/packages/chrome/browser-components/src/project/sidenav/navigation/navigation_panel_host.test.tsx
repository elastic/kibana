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
import { NavigationPanelHost } from './navigation';

describe('NavigationPanelHost', () => {
  it('calls hostRef with the element on mount and null on unmount', () => {
    const hostRef = jest.fn();
    const { unmount } = render(<NavigationPanelHost hostRef={hostRef} />);

    expect(hostRef).toHaveBeenCalledTimes(1);
    expect(hostRef).toHaveBeenCalledWith(expect.any(HTMLElement));

    unmount();

    expect(hostRef).toHaveBeenCalledTimes(2);
    expect(hostRef).toHaveBeenLastCalledWith(null);
  });
});
