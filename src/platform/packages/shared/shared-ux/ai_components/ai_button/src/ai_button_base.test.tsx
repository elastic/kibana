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

const mockUseSvgAiGradient = jest.fn();
jest.mock('./use_ai_gradient_styles', () => ({
  useAiButtonGradientStyles: jest
    .fn()
    .mockReturnValue({ buttonCss: undefined, labelCss: undefined }),
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
  mockUseSvgAiGradient.mockClear();
  mockUseSvgAiGradient.mockReturnValue(defaultSvgGradient);
});

describe('<AiButtonBase />', () => {
  it('classic variant renders label text', () => {
    render(<AiButtonBase variant="secondary">AI Assistant</AiButtonBase>);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('iconOnly variant renders an element with aria-label', () => {
    render(
      <AiButtonBase
        variant="primary"
        iconOnly
        iconType="sparkles"
        aria-label="AI Icon"
        onClick={() => undefined}
      />
    );

    expect(screen.getByLabelText('AI Icon')).toBeInTheDocument();
  });

  it.each([
    { iconGradientCss: css``, shouldRenderGradientDefs: true },
    { iconGradientCss: undefined, shouldRenderGradientDefs: false },
  ])(
    'renders gradient defs only when iconGradientCss is set',
    ({ iconGradientCss, shouldRenderGradientDefs }) => {
      mockUseSvgAiGradient.mockReturnValue({
        ...defaultSvgGradient,
        iconGradientCss,
      });

      render(
        <AiButtonBase variant="secondary" onClick={() => undefined}>
          Gradient check
        </AiButtonBase>
      );

      if (shouldRenderGradientDefs) {
        expect(screen.getByTestId('svg-ai-gradient-defs')).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('svg-ai-gradient-defs')).not.toBeInTheDocument();
      }
    }
  );
});
