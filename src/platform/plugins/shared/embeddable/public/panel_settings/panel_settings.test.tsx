/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeRange } from '@kbn/es-query';
import { PanelSettingsAccordions } from './panel_settings_accordions';
import { usePanelSettings } from './use_panel_settings';
import type { PanelSettingsApi } from './types';

jest.mock('../kibana_services', () => ({
  core: { uiSettings: { get: jest.fn() } },
}));

const globalTimeRange: TimeRange = { from: 'now-15m', to: 'now' };

const createApi = (overrides: { title?: string; timeRange?: TimeRange } = {}) =>
  ({
    title$: new BehaviorSubject<string | undefined>(overrides.title),
    defaultTitle$: new BehaviorSubject<string | undefined>('Default title'),
    hideTitle$: new BehaviorSubject<boolean | undefined>(undefined),
    description$: new BehaviorSubject<string | undefined>(undefined),
    defaultDescription$: new BehaviorSubject<string | undefined>(undefined),
    hideBorder$: new BehaviorSubject<boolean | undefined>(undefined),
    timeRange$: new BehaviorSubject<TimeRange | undefined>(overrides.timeRange),
    setTitle: jest.fn(),
    setHideTitle: jest.fn(),
    setDescription: jest.fn(),
    setHideBorder: jest.fn(),
    setTimeRange: jest.fn(),
  } satisfies PanelSettingsApi);

const Harness = ({ api }: { api: PanelSettingsApi }) => {
  const { state, updateState, hasChanges, apply } = usePanelSettings(api, globalTimeRange);
  if (!state) return null;
  return (
    <>
      <PanelSettingsAccordions
        api={api}
        state={state}
        updateState={updateState}
        fallbackTimeRange={globalTimeRange}
      />
      <span data-test-subj="hasChanges">{String(hasChanges)}</span>
      <button onClick={apply}>apply</button>
    </>
  );
};

describe('PanelSettingsAccordions', () => {
  it('renders the title and description and panel options accordions', () => {
    render(<Harness api={createApi()} />);
    expect(screen.getByText('Title and description')).toBeInTheDocument();
    expect(screen.getByText('Panel options')).toBeInTheDocument();
  });

  it('does not apply anything until the user makes a change', () => {
    const api = createApi();
    render(<Harness api={api} />);
    expect(screen.getByTestId('hasChanges')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('apply'));
    expect(api.setTitle).not.toHaveBeenCalled();
    expect(api.setTimeRange).not.toHaveBeenCalled();
  });

  it('applies a custom title and hidden border', () => {
    const api = createApi();
    render(<Harness api={api} />);
    fireEvent.change(screen.getByTestId('customEmbeddablePanelTitleInput'), {
      target: { value: 'My title' },
    });
    fireEvent.click(screen.getByTestId('customizePanelBorderlessToggle'));
    expect(screen.getByTestId('hasChanges')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('apply'));
    expect(api.setTitle).toHaveBeenCalledWith('My title');
    expect(api.setHideBorder).toHaveBeenCalledWith(true);
  });

  it('clears the custom title when reset to default', () => {
    const api = createApi({ title: 'Custom' });
    render(<Harness api={api} />);
    fireEvent.click(screen.getByTestId('resetCustomEmbeddablePanelTitleButton'));
    fireEvent.click(screen.getByText('apply'));
    expect(api.setTitle).toHaveBeenCalledWith(undefined);
  });

  it('uses the global time range when enabling a custom time range', () => {
    const api = createApi();
    render(<Harness api={api} />);
    fireEvent.click(screen.getByTestId('customizePanelShowCustomTimeRange'));
    fireEvent.click(screen.getByText('apply'));
    expect(api.setTimeRange).toHaveBeenCalledWith(globalTimeRange);
  });

  it('removes the custom time range when disabled', () => {
    const api = createApi({ timeRange: { from: 'now-1d', to: 'now' } });
    render(<Harness api={api} />);
    fireEvent.click(screen.getByTestId('customizePanelShowCustomTimeRange'));
    fireEvent.click(screen.getByText('apply'));
    expect(api.setTimeRange).toHaveBeenCalledWith(undefined);
  });
});
