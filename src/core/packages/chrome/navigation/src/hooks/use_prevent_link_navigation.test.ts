/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';

import { usePreventLinkNavigation } from './use_prevent_link_navigation';

describe('usePreventLinkNavigation', () => {
  it('prevents navigation when clicking on links', () => {
    const anchor = document.createElement('a');
    anchor.href = '#test';
    document.body.appendChild(anchor);

    renderHook(() => usePreventLinkNavigation());

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefault = jest.spyOn(event, 'preventDefault');

    anchor.dispatchEvent(event);

    expect(preventDefault).toHaveBeenCalled();

    anchor.remove();
  });

  it('removes the event listener on unmount', () => {
    const anchor = document.createElement('a');
    anchor.href = '#test';
    document.body.appendChild(anchor);

    const { unmount } = renderHook(() => usePreventLinkNavigation());
    unmount();

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefault = jest.spyOn(event, 'preventDefault');

    anchor.dispatchEvent(event);

    expect(preventDefault).not.toHaveBeenCalled();

    anchor.remove();
  });
});
