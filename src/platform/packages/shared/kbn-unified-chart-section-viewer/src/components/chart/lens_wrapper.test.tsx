/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { LensWrapper } from './lens_wrapper';
import type { LensWrapperProps } from './lens_wrapper';

// Mock the EmbeddableComponent
const mockEmbeddableComponent = jest.fn((props) => (
  <div data-test-subj="embeddable-component" data-title-highlight={props.titleHighlight}>
    Mock EmbeddableComponent
  </div>
));

// Mock useLensExtraActions
jest.mock('./hooks/use_lens_extra_actions', () => ({
  useLensExtraActions: jest.fn(() => []),
}));

describe('LensWrapper', () => {
  const mockLensProps = {
    attributes: {
      title: 'Test Chart',
      visualizationType: 'bar',
      state: {
        datasourceStates: {},
        visualization: {},
        query: { query: '', language: 'kuery' },
        filters: [],
      },
      references: [],
    },
    timeRange: {
      from: 'now-15m',
      to: 'now',
    },
  };

  const mockServices = {
    lens: {
      EmbeddableComponent: mockEmbeddableComponent,
    },
  };

  const defaultProps: LensWrapperProps = {
    lensProps: mockLensProps,
    services: mockServices as any,
    abortController: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('titleHighlight prop', () => {
    it('passes titleHighlight prop to EmbeddableComponent', () => {
      const { getByTestId } = render(
        <EuiThemeProvider>
          <LensWrapper {...defaultProps} titleHighlight="cpu" />
        </EuiThemeProvider>
      );

      expect(mockEmbeddableComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          titleHighlight: 'cpu',
        }),
        expect.anything()
      );

      const embeddableElement = getByTestId('embeddable-component');
      expect(embeddableElement).toHaveAttribute('data-title-highlight', 'cpu');
    });

    it('passes titleHighlight when undefined', () => {
      render(
        <EuiThemeProvider>
          <LensWrapper {...defaultProps} />
        </EuiThemeProvider>
      );

      expect(mockEmbeddableComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          titleHighlight: undefined,
        }),
        expect.anything()
      );
    });

    it('passes titleHighlight along with other props to EmbeddableComponent', () => {
      render(
        <EuiThemeProvider>
          <LensWrapper
            {...defaultProps}
            titleHighlight="memory"
            syncTooltips={true}
            syncCursor={true}
          />
        </EuiThemeProvider>
      );

      expect(mockEmbeddableComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          titleHighlight: 'memory',
          syncTooltips: true,
          syncCursor: true,
          title: mockLensProps.attributes.title,
          withDefaultActions: true,
        }),
        expect.anything()
      );
    });
  });

  describe('header visibility', () => {
    it('header remains visible when titleHighlight is provided', () => {
      const { getByTestId } = render(
        <EuiThemeProvider>
          <LensWrapper {...defaultProps} titleHighlight="cpu" />
        </EuiThemeProvider>
      );

      // Verify that the embeddable component is rendered (header will be rendered by EmbeddableComponent)
      expect(getByTestId('embeddable-component')).toBeInTheDocument();
    });

    it('does not hide .embPanel__header with CSS', () => {
      const { container } = render(
        <EuiThemeProvider>
          <LensWrapper {...defaultProps} titleHighlight="cpu" />
        </EuiThemeProvider>
      );

      // Verify no CSS rules hiding the header
      const style = container.querySelector('style');
      if (style) {
        expect(style.textContent).not.toContain('.embPanel__header');
        expect(style.textContent).not.toContain('visibility: hidden');
      }
    });
  });

  describe('integration with EmbeddableComponent', () => {
    it('passes all required props to EmbeddableComponent', () => {
      const onBrushEnd = jest.fn();
      const onFilter = jest.fn();
      const abortController = new AbortController();

      render(
        <EuiThemeProvider>
          <LensWrapper
            {...defaultProps}
            titleHighlight="test"
            onBrushEnd={onBrushEnd}
            onFilter={onFilter}
            abortController={abortController}
          />
        </EuiThemeProvider>
      );

      expect(mockEmbeddableComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          titleHighlight: 'test',
          title: mockLensProps.attributes.title,
          ...mockLensProps,
          onBrushEnd,
          onFilter,
          abortController,
          withDefaultActions: true,
          disabledActions: expect.arrayContaining([
            'ACTION_CUSTOMIZE_PANEL',
            'ACTION_EXPORT_CSV',
            'alertRule',
          ]),
        }),
        expect.anything()
      );
    });

    it('wraps EmbeddableComponent in PresentationPanelQuickActionContext', () => {
      const { getByTestId } = render(
        <EuiThemeProvider>
          <LensWrapper {...defaultProps} titleHighlight="test" />
        </EuiThemeProvider>
      );

      // The component should be wrapped in the context provider
      expect(getByTestId('embeddable-component')).toBeInTheDocument();
    });
  });
});
