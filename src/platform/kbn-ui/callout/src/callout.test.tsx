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
import { KbnInfoCallout } from './info_callout';
import { KbnSuccessCallout } from './success_callout';
import { KbnWarningCallout } from './warning_callout';
import { KbnDangerCallout } from './danger_callout';

const defaultProps = {
  title: 'Callout Title',
};

const additionalProps = {
  'data-test-subj': 'kbn-callout',
  size: 's' as const,
};

describe('KbnInfoCallout', () => {
  it('renders with a primary callout', () => {
    const { container } = render(<KbnInfoCallout {...defaultProps} />);

    expect(container.querySelector('.euiCallOut--primary')).not.toBeNull();
  });

  it('forwards additional props to EuiCallOut', () => {
    render(<KbnInfoCallout {...defaultProps} {...additionalProps} />);

    const callout = screen.getByTestId(additionalProps['data-test-subj']);

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-size', additionalProps.size);
  });
});

describe('KbnSuccessCallout', () => {
  it('renders with a success callout', () => {
    const { container } = render(<KbnSuccessCallout {...defaultProps} />);

    expect(container.querySelector('.euiCallOut--success')).not.toBeNull();
    expect(container.querySelector(`[data-euiicon-type="checkCircleFill"]`)).toBeInTheDocument();
  });

  it('forwards additional props to EuiCallOut', () => {
    render(<KbnSuccessCallout {...defaultProps} {...additionalProps} />);

    const callout = screen.getByTestId(additionalProps['data-test-subj']);

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-size', additionalProps.size);
  });
});

describe('KbnWarningCallout', () => {
  it('renders with a warning callout', () => {
    const { container } = render(<KbnWarningCallout {...defaultProps} />);

    expect(container.querySelector('.euiCallOut--warning')).not.toBeNull();
    expect(container.querySelector(`[data-euiicon-type="warningStatic"]`)).toBeInTheDocument();
  });

  it('forwards additional props to EuiCallOut', () => {
    render(<KbnWarningCallout {...defaultProps} {...additionalProps} />);

    const callout = screen.getByTestId(additionalProps['data-test-subj']);

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-size', additionalProps.size);
  });
});

describe('KbnDangerCallout', () => {
  it('renders with a danger callout', () => {
    const { container } = render(<KbnDangerCallout {...defaultProps} />);

    expect(container.querySelector('.euiCallOut--danger')).not.toBeNull();
    expect(container.querySelector(`[data-euiicon-type="errorFill"]`)).toBeInTheDocument();
  });

  it('forwards additional props to EuiCallOut', () => {
    render(<KbnDangerCallout {...defaultProps} {...additionalProps} />);

    const callout = screen.getByTestId(additionalProps['data-test-subj']);

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-size', additionalProps.size);
  });
});
