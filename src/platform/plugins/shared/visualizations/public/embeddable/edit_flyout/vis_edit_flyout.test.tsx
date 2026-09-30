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
import { render, screen } from '@testing-library/react';
import type { TimeRange } from '@kbn/es-query';
import type { PanelEditFlyoutProps, PanelSettingsApi } from '@kbn/embeddable-plugin/public';
import { VisEditFlyout } from './vis_edit_flyout';
import type { VisualizeEmbeddableState } from '../../../common/embeddable/types';

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: ({ getParentApi }: { getParentApi: () => unknown }) => {
    const parentApi = getParentApi() as {
      getSerializedStateForChild: () => unknown;
      disableTriggers: boolean;
    };
    return (
      <div data-test-subj="previewEmbeddable" data-disable-triggers={parentApi.disableTriggers}>
        {JSON.stringify(parentApi.getSerializedStateForChild())}
      </div>
    );
  },
  PanelEditFlyout: ({
    title,
    preview,
    editorLinkLabel,
    onNavigateToEditor,
  }: PanelEditFlyoutProps) => (
    <div>
      <h2>{title}</h2>
      {onNavigateToEditor ? <button onClick={onNavigateToEditor}>{editorLinkLabel}</button> : null}
      {preview}
    </div>
  ),
}));

jest.mock('../../services', () => ({
  getTimeFilter: () => ({ getTime: () => ({ from: 'now-15m', to: 'now' }) }),
}));

const createApi = (): PanelSettingsApi => ({
  title$: new BehaviorSubject<string | undefined>('My Vega chart'),
  hideTitle$: new BehaviorSubject<boolean | undefined>(undefined),
  description$: new BehaviorSubject<string | undefined>(undefined),
  hideBorder$: new BehaviorSubject<boolean | undefined>(undefined),
  timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  setTitle: jest.fn(),
  setHideTitle: jest.fn(),
  setDescription: jest.fn(),
  setHideBorder: jest.fn(),
  setTimeRange: jest.fn(),
});

const state = { savedObjectId: 'vis-1' } as unknown as VisualizeEmbeddableState;

const renderFlyout = (overrides: Partial<React.ComponentProps<typeof VisEditFlyout>> = {}) =>
  render(
    <VisEditFlyout
      api={createApi()}
      parentApi={{}}
      getState={() => state}
      visTypeTitle="Vega"
      navigateToEditor={jest.fn()}
      closeFlyout={jest.fn()}
      ariaLabelledBy="visEditFlyoutTitleId"
      {...overrides}
    />
  );

describe('VisEditFlyout', () => {
  it('renders the flyout with a link to the vis type editor', () => {
    renderFlyout();
    expect(screen.getByRole('heading', { name: 'Edit Vega visualization' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit in Vega' })).toBeInTheDocument();
  });

  it('hides the link when the visualization cannot be edited', () => {
    renderFlyout({ navigateToEditor: undefined });
    expect(screen.queryByRole('button', { name: 'Edit in Vega' })).not.toBeInTheDocument();
  });

  it('renders a preview of the panel with triggers disabled', () => {
    renderFlyout();
    const preview = screen.getByTestId('previewEmbeddable');
    expect(JSON.parse(preview.textContent!)).toEqual(state);
    expect(preview).toHaveAttribute('data-disable-triggers', 'true');
  });
});
