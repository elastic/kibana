/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { EuiFlyout, EuiProvider, useEuiTheme } from '@elastic/eui';
import { InspectFlyout } from './inspect_flyout';
import { INSPECT_FLYOUT_ID } from '../../../lib/constants';
import { createMockHost, mockComponentData } from '../../../__mocks__/mocks';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiFlyout: jest.fn((props: React.ComponentProps<typeof actual.EuiFlyout>) => (
      <actual.EuiFlyout {...props} />
    )),
  };
});

jest.mock('./data_section/data_section', () => {
  const { useEuiTheme: useTheme } = jest.requireActual('@elastic/eui');
  return {
    DataSection: () => {
      const { colorMode } = useTheme();
      return <span data-test-subj="flyoutColorMode">{colorMode}</span>;
    },
  };
});

const HostColorMode = () => {
  const { colorMode } = useEuiTheme();
  return <span data-test-subj="hostColorMode">{colorMode}</span>;
};

describe('InspectFlyout', () => {
  let target: HTMLElement;
  const host = createMockHost();

  beforeEach(() => {
    target = document.createElement('div');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: jest.fn(() => ({
        top: 10,
        left: 20,
        width: 100,
        height: 50,
      })),
    });
  });

  const renderFlyout = (props: Partial<React.ComponentProps<typeof InspectFlyout>> = {}) =>
    renderWithI18n(
      <InspectFlyout
        componentData={mockComponentData}
        target={target}
        host={host}
        colorMode="light"
        onClose={jest.fn()}
        {...props}
      />
    );

  it('should render correctly', () => {
    renderFlyout();

    expect(screen.getByTestId(INSPECT_FLYOUT_ID)).toBeInTheDocument();
    expect(screen.getByTestId('inspectFlyoutHeader')).toBeInTheDocument();
  });

  it('should render as a viewport flyout so host container defaults do not apply', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    // EUI's test-env `EuiFlyout` is a simplified mock (no portal, no Escape handling),
    // so the props are asserted instead of the DOM placement.
    const [flyoutProps] = jest.mocked(EuiFlyout).mock.lastCall ?? [];
    expect(flyoutProps).toEqual(
      expect.objectContaining({ container: null, onClose, id: INSPECT_FLYOUT_ID })
    );
  });

  it.each(['light', 'dark'] as const)('should render the flyout in %s mode', (colorMode) => {
    renderWithI18n(
      <EuiProvider colorMode={colorMode === 'dark' ? 'light' : 'dark'}>
        <HostColorMode />
        <InspectFlyout
          componentData={mockComponentData}
          target={target}
          host={host}
          colorMode={colorMode}
          onClose={jest.fn()}
        />
      </EuiProvider>
    );

    expect(screen.getByTestId('hostColorMode')).toHaveTextContent(
      colorMode === 'dark' ? 'LIGHT' : 'DARK'
    );
    expect(screen.getByTestId('flyoutColorMode')).toHaveTextContent(colorMode.toUpperCase());
  });

  it('should call onClose when the close button is clicked', async () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should set initial highlight position based on target', () => {
    renderFlyout();

    // For fixed positioning, check the container element that has the actual positioning
    const container = screen.getByTestId('inspectHighlightContainer');
    expect(container).toBeInTheDocument();

    const containerStyle = window.getComputedStyle(container);
    expect(containerStyle.top).toBe('10px');
    expect(containerStyle.left).toBe('20px');
    expect(containerStyle.width).toBe('100px');
    expect(containerStyle.height).toBe('50px');
    expect(containerStyle.position).toBe('fixed');

    // The highlight box should fill the container
    const highlight = screen.getByTestId('inspectHighlightBox');
    const highlightStyle = window.getComputedStyle(highlight);
    expect(highlightStyle.top).toBe('0px');
    expect(highlightStyle.left).toBe('0px');
  });

  it('should update highlight position on window resize', async () => {
    renderFlyout();

    // Verify initial position
    const container = screen.getByTestId('inspectHighlightContainer');
    let containerStyle = window.getComputedStyle(container);
    expect(containerStyle.top).toBe('10px');
    expect(containerStyle.left).toBe('20px');
    expect(containerStyle.width).toBe('100px');
    expect(containerStyle.height).toBe('50px');

    const newRect = {
      top: 50,
      left: 60,
      width: 200,
      height: 100,
    };
    (target.getBoundingClientRect as jest.Mock).mockReturnValue(newRect);

    fireEvent(window, new Event('resize'));

    // For fixed positioning, check the container element that has the actual positioning
    const updatedContainer = await screen.findByTestId('inspectHighlightContainer');
    containerStyle = window.getComputedStyle(updatedContainer);
    expect(containerStyle.top).toBe('50px');
    expect(containerStyle.left).toBe('60px');
    expect(containerStyle.width).toBe('200px');
    expect(containerStyle.height).toBe('100px');
    expect(containerStyle.position).toBe('fixed');

    // The highlight box should still fill the container
    const highlight = screen.getByTestId('inspectHighlightBox');
    const highlightStyle = window.getComputedStyle(highlight);
    expect(highlightStyle.top).toBe('0px');
    expect(highlightStyle.left).toBe('0px');
  });
});
