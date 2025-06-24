/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getSampleLayout } from './test_utils/sample_layout';
import { GridLayout, GridLayoutProps } from './grid_layout';
import { gridSettings, mockRenderPanelContents } from './test_utils/mocks';
import { EuiThemeProvider } from '@elastic/eui';

const onLayoutChange = jest.fn();

const renderGridLayout = (propsOverrides: Partial<GridLayoutProps> = {}) => {
  const props = {
    accessMode: 'EDIT',
    layout: getSampleLayout(),
    gridSettings,
    renderPanelContents: mockRenderPanelContents,
    onLayoutChange,
    ...propsOverrides,
  } as GridLayoutProps;

  const { rerender, ...rtlRest } = render(<GridLayout {...props} />, { wrapper: EuiThemeProvider });

  return {
    ...rtlRest,
    rerender: (overrides: Partial<GridLayoutProps>) => {
      const newProps = { ...props, ...overrides } as GridLayoutProps;
      return rerender(<GridLayout {...newProps} />);
    },
  };
};

const getPanelHandle = (panelId: string, interactionType: 'resize' | 'drag' = 'drag') => {
  const gridPanel = screen.getByText(`panel content ${panelId}`).closest('div')!;
  const handleText = new RegExp(interactionType === 'resize' ? /resize panel/i : /drag to move/i);
  return within(gridPanel).getByRole('button', { name: handleText });
};

describe('Keyboard navigation', () => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  Object.defineProperty(window, 'scrollY', { value: 0, writable: false });
  Object.defineProperty(document.body, 'scrollHeight', { value: 2000, writable: false });

  const pressEnter = async () => {
    await userEvent.keyboard('[Enter]');
  };
  const pressKey = async (
    k: '[Enter]' | '{Escape}' | '[ArrowDown]' | '[ArrowUp]' | '[ArrowRight]' | '[ArrowLeft]'
  ) => {
    await userEvent.keyboard(k);
  };
  it('should show the panel active when during interaction for drag handle', async () => {
    renderGridLayout();
    const panelHandle = getPanelHandle('panel1');
    panelHandle.focus();
    expect(screen.getByLabelText('panelId:panel1').closest('div')).not.toHaveClass(
      'kbnGridPanel--active'
    );
    await pressEnter();
    await pressKey('[ArrowDown]');
    expect(panelHandle).toHaveFocus(); // focus is not lost during interaction
    expect(screen.getByLabelText('panelId:panel1').closest('div')).toHaveClass(
      'kbnGridPanel--active'
    );
    await pressEnter();
    expect(screen.getByLabelText('panelId:panel1').closest('div')).not.toHaveClass(
      'kbnGridPanel--active'
    );
  });
  it('should show the panel active when during interaction for resize handle', async () => {
    renderGridLayout();
    const panelHandle = getPanelHandle('panel5', 'resize');
    panelHandle.focus();
    expect(screen.getByLabelText('panelId:panel5').closest('div')).not.toHaveClass(
      'kbnGridPanel--active'
    );
    await pressEnter();
    await pressKey('[ArrowDown]');
    expect(panelHandle).toHaveFocus(); // focus is not lost during interaction
    expect(screen.getByLabelText('panelId:panel5').closest('div')).toHaveClass(
      'kbnGridPanel--active'
    );
    await pressKey('{Escape}');
    expect(screen.getByLabelText('panelId:panel5').closest('div')).not.toHaveClass(
      'kbnGridPanel--active'
    );
    expect(panelHandle).toHaveFocus(); // focus is not lost during interaction
  });
});
