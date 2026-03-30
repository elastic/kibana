/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { WorkflowStatus } from './workflow_status';

describe('WorkflowStatus', () => {
  it('returns null when valid is true', () => {
    const { container } = render(<WorkflowStatus valid={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an EuiIconTip when valid is false', () => {
    const { container } = render(<WorkflowStatus valid={false} />);

    // EuiIconTip renders a span wrapping a tooltip anchor with an icon
    expect(container.firstChild).not.toBeNull();
  });

  it('renders errorFilled icon type when valid is false', () => {
    const { container } = render(<WorkflowStatus valid={false} />);

    // The icon tip renders an EuiIcon of type errorFilled
    const iconElement = container.querySelector('[data-euiicon-type="errorFilled"]');
    expect(iconElement).toBeInTheDocument();
  });
});
