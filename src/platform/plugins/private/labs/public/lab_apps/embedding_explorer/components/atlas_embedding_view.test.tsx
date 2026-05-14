/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { AtlasEmbeddingView } from './atlas_embedding_view';

jest.mock('../embedding_atlas_runtime', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const { act } = jest.requireActual<typeof import('react-dom/test-utils')>('react-dom/test-utils');
  const { createRoot } = jest.requireActual<typeof import('react-dom/client')>('react-dom/client');

  interface MockEmbeddingViewProps {
    data: { x: Float32Array; y: Float32Array };
    onSelection: (points: Array<{ identifier?: string; x: number; y: number }>) => void;
    onTooltip: (point: { identifier?: string; x: number; y: number } | null) => void;
    selection?: Array<{ identifier?: string }>;
  }

  class MockEmbeddingView {
    private props: MockEmbeddingViewProps;
    private readonly root;

    constructor(target: HTMLElement, props: MockEmbeddingViewProps) {
      this.props = props;
      this.root = createRoot(target);
      this.render();
    }

    update(nextProps: Partial<MockEmbeddingViewProps>) {
      this.props = { ...this.props, ...nextProps };
      this.render();
    }

    destroy() {
      act(() => {
        this.root.unmount();
      });
    }

    render() {
      const { data, onSelection, onTooltip, selection } = this.props;

      act(() => {
        this.root.render(
          ReactModule.createElement(
            'div',
            { 'data-testid': 'mockEmbeddingAtlasView' },
            ReactModule.createElement(
              'div',
              { 'data-testid': 'mockSelectionCount' },
              selection?.length ?? 0
            ),
            ReactModule.createElement(
              'button',
              {
                onClick: () =>
                  onSelection([
                    {
                      identifier: 'sample-a',
                      x: data.x[0],
                      y: data.y[0],
                    },
                  ]),
                type: 'button',
              },
              'select first point'
            ),
            ReactModule.createElement(
              'button',
              {
                onClick: () =>
                  onTooltip({
                    identifier: 'sample-b',
                    x: data.x[1],
                    y: data.y[1],
                  }),
                type: 'button',
              },
              'hover second point'
            )
          )
        );
      });
    }
  }

  return {
    EmbeddingView: MockEmbeddingView,
  };
});

describe('AtlasEmbeddingView', () => {
  const points = [
    {
      id: 'sample-a',
      x: 0.1,
      y: 0.2,
      label: 'Sample A',
      summary: 'A sample point',
      category: 'critical',
      source: 'sample',
      metadata: {},
    },
    {
      id: 'sample-b',
      x: 0.3,
      y: 0.4,
      label: 'Sample B',
      summary: 'B sample point',
      category: 'high',
      source: 'sample',
      metadata: {},
    },
  ] as const;

  it('maps Atlas selection and hover callbacks back to Kibana point ids', () => {
    const onSelectionChange = jest.fn();
    const onHoverChange = jest.fn();
    const { container, getByText } = render(
      <AtlasEmbeddingView
        densityMode={false}
        onHoverChange={onHoverChange}
        onSelectionChange={onSelectionChange}
        points={points}
        selectedPointIds={['sample-a', 'sample-b']}
      />
    );

    expect(container.querySelector('[data-testid="mockSelectionCount"]')).toHaveTextContent('2');

    fireEvent.click(getByText('select first point'));
    fireEvent.click(getByText('hover second point'));

    expect(onSelectionChange).toHaveBeenCalledWith('sample-a');
    expect(onHoverChange).toHaveBeenCalledWith('sample-b');
  });
});
