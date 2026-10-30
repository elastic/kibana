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
import { render, screen, act, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DefaultPresentationPanelApi } from '../types';
import type { PresentationPanelHoverActionsProps } from './presentation_panel_hover_actions';
import { PresentationPanelHoverActionsWrapper } from './presentation_panel_hover_actions_wrapper';

const mockHoverActionsProps = jest.fn();

jest.mock('./presentation_panel_hover_actions', () => ({
  PresentationPanelHoverActions: (props: PresentationPanelHoverActionsProps) => {
    mockHoverActionsProps(props);
    return <div data-test-subj="default-hover-actions">Default hover actions</div>;
  },
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

  describe('panel selection', () => {
    const buildSelectingParent = (selectedPanelIds: string[]) => ({
      selectedPanelIds$: new BehaviorSubject<string[]>(selectedPanelIds),
      togglePanelSelection: jest.fn(),
      clearSelectedPanels: jest.fn(),
    });

    const renderWrapper = (api: DefaultPresentationPanelApi, viewMode: ViewMode = 'edit') =>
      renderWithTheme(
        <PresentationPanelHoverActionsWrapper
          api={api}
          getActions={jest.fn()}
          setDragHandle={jest.fn()}
          viewMode={viewMode}
        >
          <div />
        </PresentationPanelHoverActionsWrapper>
      );

    const getLastSelection = () => mockHoverActionsProps.mock.lastCall?.[0].selection;

    beforeEach(() => {
      mockHoverActionsProps.mockClear();
    });

    it('passes no selection when the parent does not support selecting panels', () => {
      renderWrapper({ uuid: 'panel1', parentApi: {} });

      expect(getLastSelection()).toBeUndefined();
    });

    it('passes no selection outside edit mode', () => {
      renderWrapper({ uuid: 'panel1', parentApi: buildSelectingParent(['panel1']) }, 'view');

      expect(getLastSelection()).toBeUndefined();
    });

    it("reflects the parent's selection for this panel", async () => {
      const parentApi = buildSelectingParent([]);
      renderWrapper({ uuid: 'panel1', parentApi });
      expect(getLastSelection()).toMatchObject({ isSelectionMode: false, isSelected: false });

      act(() => parentApi.selectedPanelIds$.next(['panel2']));
      await waitFor(() =>
        expect(getLastSelection()).toMatchObject({ isSelectionMode: true, isSelected: false })
      );

      act(() => parentApi.selectedPanelIds$.next(['panel2', 'panel1']));
      await waitFor(() =>
        expect(getLastSelection()).toMatchObject({ isSelectionMode: true, isSelected: true })
      );
    });

    it("toggles this panel in the parent's selection", () => {
      const parentApi = buildSelectingParent([]);
      renderWrapper({ uuid: 'panel1', parentApi });

      getLastSelection()?.toggle();

      expect(parentApi.togglePanelSelection).toHaveBeenCalledWith('panel1');
    });
  });
});
