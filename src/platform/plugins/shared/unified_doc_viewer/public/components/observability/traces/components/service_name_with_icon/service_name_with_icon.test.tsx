/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { render } from '@testing-library/react';
import { ServiceNameWithIcon } from '.';

jest.mock('@kbn/custom-icons', () => ({
  AgentIcon: ({ agentName, size }: any) => (
    <span data-test-subj="agent-icon">
      {agentName}-{size}
    </span>
  ),
}));

describe('ServiceNameWithIcon', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('renders service name as string', () => {
    const { getByText } = render(<ServiceNameWithIcon serviceName="NodeService" />);
    expect(getByText('NodeService')).toBeInTheDocument();
  });

  it('renders service name as React node', () => {
    const { getByText } = render(<ServiceNameWithIcon serviceName={<span>NodeService</span>} />);
    expect(getByText('NodeService')).toBeInTheDocument();
  });

  it('renders AgentIcon when agentName is provided', () => {
    const { getByTestId } = render(
      <ServiceNameWithIcon agentName="java" serviceName="MyService" />
    );
    expect(getByTestId('agent-icon')).toHaveTextContent('java-m');
  });

  it('does not render AgentIcon when agentName is not provided', () => {
    const { queryByTestId } = render(<ServiceNameWithIcon serviceName="MyService" />);
    expect(queryByTestId('agent-icon')).not.toBeInTheDocument();
  });
});
