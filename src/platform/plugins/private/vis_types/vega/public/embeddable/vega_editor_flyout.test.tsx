/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { VegaEditorFlyout } from './vega_editor_flyout';

jest.mock('../components/vega_vis_editor', () => ({
  VegaSpecEditor: ({
    editorValue,
    onChange,
    onFormatChange,
  }: {
    editorValue: string;
    onChange: (value: string) => void;
    onFormatChange: (format: 'hjson' | 'json') => void;
  }) => (
    <div>
      <div data-test-subj="vegaSpecEditorValue">{editorValue}</div>
      <button onClick={() => onFormatChange('hjson')}>setFormat</button>
      <button onClick={() => onChange('{ mark: bar }')}>changeSpec</button>
    </div>
  ),
}));

const renderFlyout = ({
  isNewPanel = false,
}: {
  isNewPanel?: boolean;
} = {}) => {
  const closeFlyout = jest.fn();
  const onPreview = jest.fn();
  const onRevert = jest.fn();
  const onSave = jest.fn();

  const view = render(
    <VegaEditorFlyout
      ariaLabelledBy="vegaEditorTitle"
      closeFlyout={closeFlyout}
      initialSpec={{ format: 'hjson', value: '{ mark: point }' }}
      isNewPanel={isNewPanel}
      onPreview={onPreview}
      onRevert={onRevert}
      onSave={onSave}
    />
  );

  return { closeFlyout, onPreview, onRevert, onSave, view };
};

describe('VegaEditorFlyout', () => {
  it('renders the title with the flyout label id and all footer actions', async () => {
    renderFlyout();

    await screen.findByText('changeSpec');

    expect(screen.getByRole('heading', { name: 'Vega' })).toHaveAttribute('id', 'vegaEditorTitle');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run preview' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply and close' })).toBeDisabled();
  });

  it('runs preview for an updated spec', async () => {
    const { onPreview } = renderFlyout();

    fireEvent.click(await screen.findByText('changeSpec'));
    fireEvent.click(screen.getByRole('button', { name: 'Run preview' }));

    expect(onPreview).toHaveBeenCalledWith({ format: 'hjson', value: '{ mark: bar }' });
  });

  it('applies and closes after saving', async () => {
    const { closeFlyout, onSave } = renderFlyout();

    fireEvent.click(await screen.findByText('changeSpec'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply and close' }));

    expect(onSave).toHaveBeenCalledWith({ format: 'hjson', value: '{ mark: bar }' });
    expect(closeFlyout).toHaveBeenCalledTimes(1);
  });

  it('closes without saving when cancel is clicked', async () => {
    const { closeFlyout, onSave } = renderFlyout();

    await screen.findByText('changeSpec');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(closeFlyout).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reverts when the flyout unmounts without saving', async () => {
    const { onRevert, view } = renderFlyout();

    await screen.findByText('changeSpec');
    view.unmount();

    expect(onRevert).toHaveBeenCalledTimes(1);
  });
});
