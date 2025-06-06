/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useNewTabProps } from './use_new_tab_props';

describe('useNewTabProps', () => {
  it('returns a function that returns a new tab props', () => {
    const { result } = renderHook(() => useNewTabProps({ numberOfInitialItems: 0 }));
    const getNewTabDefaultProps = result.current.getNewTabDefaultProps;

    const tab1 = getNewTabDefaultProps();
    const tab2 = getNewTabDefaultProps();

    expect(tab1).toEqual({
      id: expect.any(String),
      label: 'Untitled 1',
    });

    expect(tab2).toEqual({
      id: expect.any(String),
      label: 'Untitled 2',
    });

    expect(tab1.id).not.toEqual(tab2.id);
  });

  it('starts from the specified index', () => {
    const { result } = renderHook(() => useNewTabProps({ numberOfInitialItems: 5 }));
    const getNewTabDefaultProps = result.current.getNewTabDefaultProps;

    expect(getNewTabDefaultProps()).toEqual({
      id: expect.any(String),
      label: 'Untitled 6',
    });

    expect(getNewTabDefaultProps()).toEqual({
      id: expect.any(String),
      label: 'Untitled 7',
    });
  });
});
