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

import { AiButtonBase } from './ai_button_base';

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
  colors: { startColor: '#000', endColor: '#fff' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAiButtonGradientStyles.mockReturnValue({ buttonCss: undefined, labelCss: undefined });
  mockUseSvgAiGradient.mockReturnValue(defaultSvgGradient);
});

describe('<AiButtonBase />', () => {
  it('renders', () => {
    render(<AiButtonBase variant="base">AI Assistant</AiButtonBase>);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(mockUseAiButtonGradientStyles).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'base' })
    );
    expect(mockUseSvgAiGradient).toHaveBeenCalledWith({ variant: 'base' });
  });

  it('accent variant renders EuiButton with fill', () => {
    render(<AiButtonBase variant="accent">AI Assistant</AiButtonBase>);

    expect(mockUseAiButtonGradientStyles).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'accent' })
    );
    expect(mockUseSvgAiGradient).toHaveBeenCalledWith({ variant: 'accent' });
  });

  it('empty variant uses EuiButtonEmpty', () => {
    const { container } = render(<AiButtonBase variant="empty">AI Assistant</AiButtonBase>);

    expect(container.querySelector('.euiButtonEmpty')).toBeTruthy();
    expect(mockUseAiButtonGradientStyles).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'empty' })
    );
    expect(mockUseSvgAiGradient).toHaveBeenCalledWith({ variant: 'empty' });
  });

  it('iconOnly variant renders EuiButtonIcon and passes iconOnly to hooks', () => {
    const { container } = render(
      <AiButtonBase
        variant="base"
        iconOnly
        iconType="sparkles"
        aria-label="AI Icon"
        onClick={() => undefined}
      />
    );

    expect(container.querySelector('button.euiButtonIcon')).toBeInTheDocument();
    expect(mockUseAiButtonGradientStyles).toHaveBeenCalledWith({
      variant: 'base',
      iconOnly: true,
    });
  });

  it('renders gradient defs only when iconGradientCss is set', () => {
    mockUseSvgAiGradient.mockReturnValue({
      ...defaultSvgGradient,
      iconGradientCss: css``,
    });

    render(<AiButtonBase variant="base">Gradient check</AiButtonBase>);

    expect(screen.getByTestId('svg-ai-gradient-defs')).toBeInTheDocument();
  });

  it("doesn't render gradient defs when iconGradientCss is undefined", () => {
    mockUseSvgAiGradient.mockReturnValue({
      ...defaultSvgGradient,
      iconGradientCss: undefined,
    });

    render(<AiButtonBase variant="base">Gradient check</AiButtonBase>);

    expect(screen.queryByTestId('svg-ai-gradient-defs')).not.toBeInTheDocument();
  });
});
