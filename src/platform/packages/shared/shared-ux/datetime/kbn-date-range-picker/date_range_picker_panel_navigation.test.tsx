/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  DateRangePickerPanelNavigationProvider,
  DateRangePickerPanel,
  useDateRangePickerPanelNavigation,
  type DateRangePickerPanelDescriptor,
} from './date_range_picker_panel_navigation';

const panels: DateRangePickerPanelDescriptor[] = [
  { id: 'main', title: 'Main', icon: 'home' },
  { id: 'presets', title: 'Quick presets', icon: 'clock' },
  { id: 'calendar', title: 'Calendar', icon: 'calendar' },
];

/** Helper that exposes navigation controls as buttons. */
const NavigationControls = () => {
  const { activePanelId, canGoBack, navigateTo, goBack } = useDateRangePickerPanelNavigation();

  return (
    <div>
      <span data-test-subj="activePanelId">{activePanelId}</span>
      <span data-test-subj="canGoBack">{String(canGoBack)}</span>
      <button data-test-subj="goToPresets" onClick={() => navigateTo('presets')}>
        Go to presets
      </button>
      <button data-test-subj="goToCalendar" onClick={() => navigateTo('calendar')}>
        Go to calendar
      </button>
      <button data-test-subj="goBack" onClick={goBack}>
        Go back
      </button>
    </div>
  );
};

const renderNavigation = (defaultPanelId = 'main') =>
  render(
    <DateRangePickerPanelNavigationProvider
      defaultPanelId={defaultPanelId}
      panelDescriptors={panels}
    >
      <NavigationControls />
      <DateRangePickerPanel id="main">
        <div data-test-subj="panel-main">Main panel</div>
      </DateRangePickerPanel>
      <DateRangePickerPanel id="presets">
        <div data-test-subj="panel-presets">Presets panel</div>
      </DateRangePickerPanel>
      <DateRangePickerPanel id="calendar">
        <div data-test-subj="panel-calendar">Calendar panel</div>
      </DateRangePickerPanel>
    </DateRangePickerPanelNavigationProvider>
  );

describe('DateRangePickerPanelNavigation', () => {
  it('renders the default panel on mount', () => {
    renderNavigation();

    expect(screen.getByTestId('panel-main')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-presets')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-calendar')).not.toBeInTheDocument();
    expect(screen.getByTestId('activePanelId')).toHaveTextContent('main');
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false');
  });

  it('navigateTo switches to the target panel', () => {
    renderNavigation();

    fireEvent.click(screen.getByTestId('goToPresets'));

    expect(screen.queryByTestId('panel-main')).not.toBeInTheDocument();
    expect(screen.getByTestId('panel-presets')).toBeInTheDocument();
    expect(screen.getByTestId('activePanelId')).toHaveTextContent('presets');
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true');
  });

  it('goBack returns to the previous panel', () => {
    renderNavigation();

    fireEvent.click(screen.getByTestId('goToPresets'));
    fireEvent.click(screen.getByTestId('goBack'));

    expect(screen.getByTestId('panel-main')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-presets')).not.toBeInTheDocument();
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false');
  });

  it('goBack is a no-op when at the root panel', () => {
    renderNavigation();

    fireEvent.click(screen.getByTestId('goBack'));

    expect(screen.getByTestId('panel-main')).toBeInTheDocument();
    expect(screen.getByTestId('activePanelId')).toHaveTextContent('main');
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false');
  });

  it('supports multi-level navigation and full back-tracking', () => {
    renderNavigation();

    fireEvent.click(screen.getByTestId('goToPresets'));
    fireEvent.click(screen.getByTestId('goToCalendar'));

    expect(screen.getByTestId('panel-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('true');

    fireEvent.click(screen.getByTestId('goBack'));
    expect(screen.getByTestId('panel-presets')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('goBack'));
    expect(screen.getByTestId('panel-main')).toBeInTheDocument();
    expect(screen.getByTestId('canGoBack')).toHaveTextContent('false');
  });

  it('exposes panel descriptors via context', () => {
    const PanelList = () => {
      const { panelDescriptors: contextPanels } = useDateRangePickerPanelNavigation();

      return (
        <ul>
          {contextPanels.map((p) => (
            <li key={p.id} data-test-subj={`descriptor-${p.id}`}>
              {p.title}
            </li>
          ))}
        </ul>
      );
    };

    render(
      <DateRangePickerPanelNavigationProvider defaultPanelId="main" panelDescriptors={panels}>
        <PanelList />
      </DateRangePickerPanelNavigationProvider>
    );

    expect(screen.getByTestId('descriptor-main')).toHaveTextContent('Main');
    expect(screen.getByTestId('descriptor-presets')).toHaveTextContent('Quick presets');
    expect(screen.getByTestId('descriptor-calendar')).toHaveTextContent('Calendar');
  });

  it('resets to default panel on remount', () => {
    const { unmount } = renderNavigation();

    fireEvent.click(screen.getByTestId('goToPresets'));
    expect(screen.getByTestId('panel-presets')).toBeInTheDocument();

    unmount();
    renderNavigation();

    expect(screen.getByTestId('panel-main')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-presets')).not.toBeInTheDocument();
  });

  it('throws when useDateRangePickerPanelNavigation is used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<NavigationControls />)).toThrow(
      'useDateRangePickerPanelNavigation must be used within a DateRangePickerPanelNavigationProvider'
    );

    spy.mockRestore();
  });

  describe('focus restoration', () => {
    const renderWithFocusableButtons = () =>
      render(
        <DateRangePickerPanelNavigationProvider defaultPanelId="main" panelDescriptors={panels}>
          <NavigationControls />
          <DateRangePickerPanel id="main">
            <button data-test-subj="main-btn-a">A</button>
            <button data-test-subj="main-btn-b">B</button>
            <button data-test-subj="main-btn-c">C</button>
          </DateRangePickerPanel>
          <DateRangePickerPanel id="presets">
            <button data-test-subj="presets-btn-x">X</button>
          </DateRangePickerPanel>
          <DateRangePickerPanel id="calendar">
            <button data-test-subj="calendar-btn-y">Y</button>
          </DateRangePickerPanel>
        </DateRangePickerPanelNavigationProvider>
      );

    it('restores focus to the previously focused element when navigating back', () => {
      renderWithFocusableButtons();

      screen.getByTestId('main-btn-b').focus();
      fireEvent.click(screen.getByTestId('goToPresets'));
      fireEvent.click(screen.getByTestId('goBack'));

      expect(screen.getByTestId('main-btn-b')).toHaveFocus();
    });

    it('does not restore focus on first visit to a panel', () => {
      renderWithFocusableButtons();

      fireEvent.click(screen.getByTestId('goToPresets'));

      expect(screen.getByTestId('presets-btn-x')).not.toHaveFocus();
    });

    it('restores focus across multi-level navigation', () => {
      renderWithFocusableButtons();

      screen.getByTestId('main-btn-c').focus();
      fireEvent.click(screen.getByTestId('goToPresets'));

      screen.getByTestId('presets-btn-x').focus();
      fireEvent.click(screen.getByTestId('goToCalendar'));

      fireEvent.click(screen.getByTestId('goBack'));
      expect(screen.getByTestId('presets-btn-x')).toHaveFocus();

      fireEvent.click(screen.getByTestId('goBack'));
      expect(screen.getByTestId('main-btn-c')).toHaveFocus();
    });
  });
});
