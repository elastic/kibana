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
import type { ActionType } from '@kbn/actions-types';
import { ConnectorTypeCard } from './connector_type_card';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiIcon: ({ size, type }: { size: string; type: string }) => (
    <span data-test-subj="iconStub" data-size={size} data-type={type} />
  ),
}));
import { getConnectorTypeCardItem } from './get_connector_type_card_item';

const actionType = (overrides: Partial<ActionType> = {}): ActionType => ({
  id: '.test',
  name: 'Test type',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: [],
  isSystemActionType: false,
  isDeprecated: false,
  ...overrides,
});

const registry = (model?: {
  iconClass: string;
  selectMessage: string;
  isExperimental?: boolean;
}) => ({
  has: () => model !== undefined,
  get: () => model as never,
});

describe('getConnectorTypeCardItem', () => {
  it('takes icon and description from the registered model of a stack type', () => {
    expect(
      getConnectorTypeCardItem({
        actionType: actionType(),
        actionTypeRegistry: registry({ iconClass: 'logoSlack', selectMessage: 'Send messages' }),
      })
    ).toEqual({
      actionType: actionType(),
      iconClass: 'logoSlack',
      selectMessage: 'Send messages',
      name: 'Test type',
      isExperimental: undefined,
      isDeprecated: false,
    });
  });

  it('describes a spec type from the type itself with a generic icon fallback', () => {
    const spec = actionType({ id: '.unknown-spec', source: 'spec', description: 'From the spec' });

    expect(getConnectorTypeCardItem({ actionType: spec, actionTypeRegistry: registry() })).toEqual(
      expect.objectContaining({ iconClass: 'plugs', selectMessage: 'From the spec' })
    );
  });
});

describe('ConnectorTypeCard', () => {
  const item = getConnectorTypeCardItem({
    actionType: actionType(),
    actionTypeRegistry: registry({ iconClass: 'logoSlack', selectMessage: 'Send messages' }),
  });

  it('renders the type and calls back on click', () => {
    const onClick = jest.fn();
    render(<ConnectorTypeCard item={item} onClick={onClick} />);

    const card = screen.getByTestId('.test-card');
    expect(card).toHaveTextContent('Test type');
    expect(card).toHaveTextContent('Send messages');
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows the technical preview badge for experimental types', () => {
    render(<ConnectorTypeCard item={{ ...item, isExperimental: true }} onClick={jest.fn()} />);

    expect(screen.getByText('Technical preview')).toBeInTheDocument();
  });

  it('shows the deprecated badge over the technical preview badge', () => {
    render(
      <ConnectorTypeCard
        item={{ ...item, isExperimental: true, isDeprecated: true }}
        onClick={jest.fn()}
      />
    );

    expect(screen.getByText('Deprecated')).toBeInTheDocument();
    expect(screen.queryByText('Technical preview')).not.toBeInTheDocument();
  });

  it('is disabled when the license does not allow the type', () => {
    const blocked = {
      ...item,
      actionType: actionType({ enabledInLicense: false, minimumLicenseRequired: 'gold' }),
    };
    render(<ConnectorTypeCard item={blocked} onClick={jest.fn()} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled for a reason of the caller', () => {
    render(<ConnectorTypeCard item={item} onClick={jest.fn()} disabledReason="No permission" />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('passes a smaller icon size in the compact variant', () => {
    render(<ConnectorTypeCard item={item} onClick={jest.fn()} size="s" />);

    expect(screen.getByTestId('iconStub')).toHaveAttribute('data-size', 'l');
  });

  it('keeps the badge in the compact variant', () => {
    render(
      <ConnectorTypeCard item={{ ...item, isExperimental: true }} onClick={jest.fn()} size="s" />
    );

    expect(screen.getByText('Technical preview')).toBeInTheDocument();
  });

  it('still shows the description in the compact variant', () => {
    render(<ConnectorTypeCard item={item} onClick={jest.fn()} size="s" />);

    expect(screen.getByTestId('.test-card')).toHaveTextContent('Send messages');
  });

  it('keeps the connector flyout icon size by default', () => {
    render(<ConnectorTypeCard item={item} onClick={jest.fn()} />);

    expect(screen.getByTestId('iconStub')).toHaveAttribute('data-size', 'xl');
  });

  it('lets the caller replace the description', () => {
    render(<ConnectorTypeCard item={item} onClick={jest.fn()} description="Custom body" />);

    expect(screen.getByTestId('.test-card')).toHaveTextContent('Custom body');
    expect(screen.getByTestId('.test-card')).not.toHaveTextContent('Send messages');
  });
});
