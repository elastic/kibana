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
  interface MockEmbeddingViewProps {
    data: { x: Float32Array; y: Float32Array };
    onSelection: (points: Array<{ identifier?: string; x: number; y: number }>) => void;
    onTooltip: (point: { identifier?: string; x: number; y: number } | null) => void;
    selection?: Array<{ identifier?: string }>;
  }

  class MockEmbeddingView {
    private props: MockEmbeddingViewProps;
    private readonly target: HTMLElement;

    constructor(target: HTMLElement, props: MockEmbeddingViewProps) {
      this.target = target;
      this.props = props;
      this.render();
    }

    update(nextProps: Partial<MockEmbeddingViewProps>) {
      this.props = { ...this.props, ...nextProps };
      this.render();
    }

    destroy() {
      this.target.replaceChildren();
    }

    render() {
      const { data, onSelection, onTooltip, selection } = this.props;
      const container = globalThis.document.createElement('div');
      container.dataset.testid = 'mockEmbeddingAtlasView';

      const selectionCount = globalThis.document.createElement('div');
      selectionCount.dataset.testid = 'mockSelectionCount';
      selectionCount.textContent = String(selection?.length ?? 0);

      const selectButton = globalThis.document.createElement('button');
      selectButton.type = 'button';
      selectButton.textContent = 'select first point';
      selectButton.addEventListener('click', () =>
        onSelection([
          {
            identifier: 'sample-a',
            x: data.x[0],
            y: data.y[0],
          },
        ])
      );

      const hoverButton = globalThis.document.createElement('button');
      hoverButton.type = 'button';
      hoverButton.textContent = 'hover second point';
      hoverButton.addEventListener('click', () =>
        onTooltip({
          identifier: 'sample-b',
          x: data.x[1],
          y: data.y[1],
        })
      );

      container.append(selectionCount, selectButton, hoverButton);
      this.target.replaceChildren(container);
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
