/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import { AgentName } from '@kbn/elastic-agent-utils';
import { TransactionNameIcon } from './transaction_name_icon';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(() => ({
    euiTheme: {
      size: {
        xs: '',
      },
    },
  })),
}));

describe('TransactionNameIcon', () => {
  const dataTestSub = 'discoverContextualComponentsSummaryColumnTransactionNameIcon';

  it('should render the "globe" icon when agentName is a RUM agent', () => {
    const { getByTestId } = render(TransactionNameIcon('rum-js'));

    const icon = getByTestId(dataTestSub);
    expect(icon).toHaveAttribute('data-euiicon-type', 'globe');
  });

  it('should render the "merge" icon when agentName is not a RUM agent', () => {
    const { getByTestId } = render(TransactionNameIcon('go'));

    const icon = getByTestId(dataTestSub);
    expect(icon).toHaveAttribute('data-euiicon-type', 'merge');
  });

  it('should render the "merge" icon when agentName is undefined', () => {
    const { getByTestId } = render(TransactionNameIcon(undefined as unknown as AgentName));

    const icon = getByTestId(dataTestSub);
    expect(icon).toHaveAttribute('data-euiicon-type', 'merge');
  });

  it('should render the "merge" icon when agentName is null', () => {
    const { getByTestId } = render(TransactionNameIcon(null as unknown as AgentName));

    const icon = getByTestId(dataTestSub);
    expect(icon).toHaveAttribute('data-euiicon-type', 'merge');
  });
});
