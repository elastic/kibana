/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { useStreamsFlyoutRenderer } from '../hooks/use_streams_flyout_renderer';
import { StreamFieldSection } from './stream_field_section';

jest.mock('../hooks/use_streams_flyout_renderer', () => ({
  useStreamsFlyoutRenderer: jest.fn(),
}));

const mockedUseStreamsFlyoutRenderer = useStreamsFlyoutRenderer as jest.Mock;

describe('StreamFieldSection', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders nothing when there is no streams flyout renderer', () => {
    mockedUseStreamsFlyoutRenderer.mockReturnValue(undefined);

    const { container } = render(<StreamFieldSection sourceName="logs-foo-default" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing and does not invoke the renderer when sourceName is empty', () => {
    const renderer = jest.fn();
    mockedUseStreamsFlyoutRenderer.mockReturnValue(renderer);

    const { container } = render(<StreamFieldSection sourceName="" />);

    expect(container).toBeEmptyDOMElement();
    expect(renderer).not.toHaveBeenCalled();
  });

  it('invokes the renderer with { streamName } and renders its output', () => {
    const renderer = jest.fn(({ streamName }: { streamName: string }) => (
      <div data-test-subj="streamRendererOutput">stream:{streamName}</div>
    ));
    mockedUseStreamsFlyoutRenderer.mockReturnValue(renderer);

    const { getByTestId } = render(<StreamFieldSection sourceName="logs-foo-default" />);

    expect(renderer).toHaveBeenCalledTimes(1);
    expect(renderer).toHaveBeenCalledWith({ streamName: 'logs-foo-default' });
    expect(getByTestId('streamRendererOutput')).toHaveTextContent('stream:logs-foo-default');
  });
});
