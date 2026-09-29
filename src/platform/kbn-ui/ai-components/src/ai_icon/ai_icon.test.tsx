/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AiIcon } from './ai_icon';

const mockUseSvgAiGradient = vi.fn();
vi.mock('../gradient_styles/use_ai_gradient_styles', () => {
      const mocked = {
      useSvgAiGradient: () => mockUseSvgAiGradient(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../gradient_styles/svg_ai_gradient_defs', () => {
      const mocked = {
      SvgAiGradientDefs: () => <div data-test-subj="svg-ai-gradient-defs" />,
    };
      return { ...mocked, default: mocked };
    });

const defaultSvgGradient = {
  gradientId: 'test-gradient',
  iconGradientCss: undefined,
  colors: { startColor: '#000', endColor: '#fff' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSvgAiGradient.mockReturnValue(defaultSvgGradient);
});

describe('<AiIcon />', () => {
  it('renders EuiIcon, gradient defs, and calls useSvgAiGradient', () => {
    const { container } = render(<AiIcon iconType="sparkles" aria-hidden={true} />);

    expect(mockUseSvgAiGradient).toHaveBeenCalled();
    expect(screen.getByTestId('svg-ai-gradient-defs')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="sparkles"]')).toBeInTheDocument();
  });

  it('forwards props to EuiIcon', () => {
    render(<AiIcon iconType="productAgent" title="Agent icon" />);

    expect(screen.getByTitle('Agent icon')).toBeInTheDocument();
  });
});
