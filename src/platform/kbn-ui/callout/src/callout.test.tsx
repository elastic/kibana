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
import { InfoCallout } from './info_callout';
import { SuccessCallout } from './success_callout';
import { WarningCallout } from './warning_callout';
import { ErrorCallout } from './error_callout';

const defaultProps = {
  title: 'Callout Title',
};

const additionalProps = {
  'data-test-subj': 'kbn-callout',
  size: 's' as const,
};

describe('InfoCallout', () => {
  it('renders with a primary callout', () => {
    const { container } = render(<InfoCallout {...defaultProps} />);

    expect(container.querySelector('.euiCallOut--primary')).not.toBeNull();
  });

  it('forwards additional props to EuiCallOut', () => {
    render(<InfoCallout {...defaultProps} {...additionalProps} />);

    const callout = screen.getByTestId(additionalProps['data-test-subj']);

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-size', additionalProps.size);
  });
});

describe('SuccessCallout', () => {
  it('renders with a success callout', () => {
    const { container } = render(<SuccessCallout {...defaultProps} />);

    expect(container.querySelector('.euiCallOut--success')).not.toBeNull();
    expect(container.querySelector(`[data-euiicon-type="checkCircleFill"]`)).toBeInTheDocument();
  });

  it('forwards additional props to EuiCallOut', () => {
    render(<SuccessCallout {...defaultProps} {...additionalProps} />);

    const callout = screen.getByTestId(additionalProps['data-test-subj']);

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-size', additionalProps.size);
  });
});

describe('WarningCallout', () => {
  it('renders with a warning callout', () => {
    const { container } = render(<WarningCallout {...defaultProps} />);

    expect(container.querySelector('.euiCallOut--warning')).not.toBeNull();
    expect(container.querySelector(`[data-euiicon-type="warningStatic"]`)).toBeInTheDocument();
  });

  it('forwards additional props to EuiCallOut', () => {
    render(<WarningCallout {...defaultProps} {...additionalProps} />);

    const callout = screen.getByTestId(additionalProps['data-test-subj']);

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-size', additionalProps.size);
  });
});

describe('ErrorCallout', () => {
  it('renders with an error callout', () => {
    const { container } = render(<ErrorCallout {...defaultProps} />);

    expect(container.querySelector('.euiCallOut--danger')).not.toBeNull();
    expect(container.querySelector(`[data-euiicon-type="errorFill"]`)).toBeInTheDocument();
  });

  it('forwards additional props to EuiCallOut', () => {
    render(<ErrorCallout {...defaultProps} {...additionalProps} />);

    const callout = screen.getByTestId(additionalProps['data-test-subj']);

    expect(callout).toBeInTheDocument();
    expect(callout).toHaveAttribute('data-size', additionalProps.size);
  });
});
