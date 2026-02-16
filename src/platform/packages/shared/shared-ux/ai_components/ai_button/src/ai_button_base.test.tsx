/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { css } from '@emotion/react';

import { AiButtonInternal } from './ai_button_internal';

const mockUseAiButtonGradientStyles = jest.fn();
const mockUseSvgAiGradient = jest.fn();
jest.mock('./use_ai_gradient_styles', () => ({
  useAiButtonGradientStyles: (opts: unknown) => mockUseAiButtonGradientStyles(opts),
  useSvgAiGradient: (opts: unknown) => mockUseSvgAiGradient(opts),
}));

jest.mock('./svg_ai_gradient_defs', () => ({
  SvgAiGradientDefs: () => <div data-test-subj="svg-ai-gradient-defs" />,
}));

const defaultSvgGradient = {
  gradientId: 'test-gradient',
  iconGradientCss: undefined,
  stops: { startColor: '#000', endColor: '#fff', startOffsetPercent: 0, endOffsetPercent: 100 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAiButtonGradientStyles.mockReturnValue({ buttonCss: undefined, labelCss: undefined });
  mockUseSvgAiGradient.mockReturnValue(defaultSvgGradient);
});

describe('<AiButtonInternal />', () => {
  it('base variant renders label text', () => {
    render(<AiButtonInternal variant="base">AI Assistant</AiButtonInternal>);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(mockUseAiButtonGradientStyles).toHaveBeenCalledWith(
      expect.objectContaining({ fill: false, variant: 'base' })
    );
    expect(mockUseSvgAiGradient).toHaveBeenCalledWith(
      expect.objectContaining({ isFilled: false, variant: 'base' })
    );
  });

  it('accent variant renders EuiButton with fill', () => {
    render(<AiButtonInternal variant="accent">AI Assistant</AiButtonInternal>);

    expect(mockUseAiButtonGradientStyles).toHaveBeenCalledWith(
      expect.objectContaining({ fill: true, variant: 'accent' })
    );
    expect(mockUseSvgAiGradient).toHaveBeenCalledWith(
      expect.objectContaining({ isFilled: true, variant: 'accent' })
    );
  });

  it('empty variant uses EuiButtonEmpty', () => {
    const { container } = render(<AiButtonInternal variant="empty">AI Assistant</AiButtonInternal>);

    expect(container.querySelector('.euiButtonEmpty')).toBeTruthy();
    expect(mockUseAiButtonGradientStyles).toHaveBeenCalledWith(
      expect.objectContaining({ fill: false, variant: 'empty' })
    );
    expect(mockUseSvgAiGradient).toHaveBeenCalledWith(
      expect.objectContaining({ isFilled: false, variant: 'empty' })
    );
  });

  it('iconOnly variant renders EuiButtonIcon', () => {
    const { container } = render(
      <AiButtonInternal
        variant="base"
        iconOnly
        iconType="sparkles"
        aria-label="AI Icon"
        onClick={() => undefined}
      />
    );

    expect(container.querySelector('button.euiButtonIcon')).toBeInTheDocument();
  });

  it.each([{ iconGradientCss: css``, iconGradientCssState: 'set' }])(
    'renders gradient defs only when iconGradientCss is $iconGradientCssState',
    ({ iconGradientCss }) => {
      mockUseSvgAiGradient.mockReturnValue({
        ...defaultSvgGradient,
        iconGradientCss,
      });

      render(<AiButtonInternal variant="base">Gradient check</AiButtonInternal>);

      expect(screen.getByTestId('svg-ai-gradient-defs')).toBeInTheDocument();
    }
  );

  it.each([{ iconGradientCss: undefined, iconGradientCssState: 'unset' }])(
    "doesn't render gradient defs when iconGradientCss is $iconGradientCssState",
    ({ iconGradientCss }) => {
      mockUseSvgAiGradient.mockReturnValue({
        ...defaultSvgGradient,
        iconGradientCss,
      });

      render(<AiButtonInternal variant="base">Gradient check</AiButtonInternal>);

      expect(screen.queryByTestId('svg-ai-gradient-defs')).not.toBeInTheDocument();
    }
  );
});
