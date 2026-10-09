/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import type { DefaultPresentationPanelApi } from '../types';
import { PresentationPanelHoverActionsWrapper } from './presentation_panel_hover_actions_wrapper';

jest.mock('./presentation_panel_hover_actions', () => ({
  PresentationPanelHoverActions: () => (
    <div data-test-subj="default-hover-actions">Default hover actions</div>
  ),
}));

describe('PresentationPanelHoverActionsWrapper', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<EuiThemeProvider>{component}</EuiThemeProvider>);
  };

  it('does not remount children when toggling overridden hover actions', async () => {
    const overrideHoverActions$ = new BehaviorSubject<boolean>(false);
    const defaultTitle$ = new BehaviorSubject<string | undefined>('Panel');
    const title$ = new BehaviorSubject<string | undefined>(undefined);
    const hasLockedHoverActions$ = new BehaviorSubject<boolean>(false);

    const OverriddenHoverActionsComponent = () => (
      <div data-test-subj="overridden-hover-actions">Overridden hover actions</div>
    );

    const api: DefaultPresentationPanelApi = {
      uuid: 'test-panel',
      defaultTitle$,
      title$,
      hasLockedHoverActions$,
      overrideHoverActions$,
      OverriddenHoverActionsComponent,
    };

    let mountCount = 0;

    const Child = () => {
      useEffect(() => {
        mountCount += 1;
      }, []);

      return <div />;
    };

    renderWithTheme(
      <PresentationPanelHoverActionsWrapper
        api={api}
        getActions={jest.fn()}
        setDragHandle={jest.fn()}
      >
        <Child />
      </PresentationPanelHoverActionsWrapper>
    );

    expect(screen.getByTestId('default-hover-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('overridden-hover-actions')).not.toBeInTheDocument();
    expect(mountCount).toBe(1);

    act(() => {
      overrideHoverActions$.next(true);
    });

    expect(await screen.findByTestId('default-hover-actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('overridden-hover-actions')).toBeInTheDocument();
    expect(mountCount).toBe(1);

    act(() => {
      overrideHoverActions$.next(false);
    });

    expect(await screen.findByTestId('default-hover-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('overridden-hover-actions')).not.toBeInTheDocument();
    expect(mountCount).toBe(1);
  });
});
