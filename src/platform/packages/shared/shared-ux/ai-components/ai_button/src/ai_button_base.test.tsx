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
import { css } from '@emotion/react';

import { AiButtonBase } from './ai_button_base';

const mockUseAiButtonGradientStyles = jest.fn();
const mockUseSvgAiGradient = jest.fn();
jest.mock('../../gradient_styles/use_ai_gradient_styles', () => ({
  useAiButtonGradientStyles: (opts: unknown) => mockUseAiButtonGradientStyles(opts),
  useSvgAiGradient: (opts: unknown) => mockUseSvgAiGradient(opts),
}));

jest.mock('../../gradient_styles/svg_ai_gradient_defs', () => ({
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

  it('iconOnly variant renders a button and passes iconOnly to hooks', () => {
    render(
      <AiButtonBase
        variant="base"
        iconOnly
        iconType="sparkles"
        aria-label="AI Icon"
        onClick={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: 'AI Icon' })).toBeInTheDocument();
    expect(mockUseAiButtonGradientStyles).toHaveBeenCalledWith({
      variant: 'base',
      iconOnly: true,
    });
  });

  it('does not show a tooltip on hover for iconOnly buttons by default', () => {
    render(
      <AiButtonBase
        variant="base"
        iconOnly
        iconType="sparkles"
        aria-label="AI Icon"
        onClick={() => undefined}
      />
    );

    fireEvent.mouseOver(screen.getByRole('button', { name: 'AI Icon' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows a tooltip on hover when withToolTip is true', async () => {
    render(
      <AiButtonBase
        variant="base"
        iconOnly
        withToolTip
        iconType="sparkles"
        aria-label="Custom tooltip"
        onClick={() => undefined}
      />
    );

    fireEvent.mouseOver(screen.getByRole('button', { name: 'Custom tooltip' }));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('shows aria-label in tooltip when withToolTip is true and toolTipContent is omitted', async () => {
    render(
      <AiButtonBase
        variant="base"
        iconOnly
        withToolTip
        iconType="sparkles"
        aria-label="Custom tooltip"
        onClick={() => undefined}
      />
    );

    const button = screen.getByRole('button', { name: 'Custom tooltip' });
    fireEvent.mouseOver(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Custom tooltip');
  });

  it('shows toolTipContent in tooltip when withToolTip is true', async () => {
    render(
      <AiButtonBase
        variant="base"
        iconOnly
        withToolTip
        toolTipContent="Explicit tooltip"
        iconType="sparkles"
        aria-label="Accessible name"
        onClick={() => undefined}
      />
    );

    const button = screen.getByRole('button', { name: 'Accessible name' });
    fireEvent.mouseOver(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Explicit tooltip');
  });

  it('shows static add-to-chat label in tooltip when withToolTip is true and iconType is addToChat', async () => {
    render(
      <AiButtonBase
        variant="base"
        iconOnly
        withToolTip
        toolTipContent="Should not appear"
        iconType="addToChat"
        aria-label="Different aria label"
        onClick={() => undefined}
      />
    );

    const button = screen.getByRole('button', { name: 'Different aria label' });
    fireEvent.mouseOver(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Add to chat');
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

  it('uses static "Add to chat" label when iconType is addToChat', () => {
    render(
      <AiButtonBase variant="base" iconType="addToChat">
        Custom label
      </AiButtonBase>
    );

    expect(screen.getByText('Add to chat')).toBeInTheDocument();
    expect(screen.queryByText('Custom label')).not.toBeInTheDocument();
  });

  it('uses children as label when iconType is productAgent', () => {
    render(
      <AiButtonBase variant="base" iconType="productAgent">
        Custom label
      </AiButtonBase>
    );

    expect(screen.getByText('Custom label')).toBeInTheDocument();
    expect(screen.queryByText('Add to chat')).not.toBeInTheDocument();
  });
});
