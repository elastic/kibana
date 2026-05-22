/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { ESQLVariableType } from '@kbn/esql-types';
import { CreateESQLRuleFlyout } from './create_esql_rule_flyout';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { internalStateActions } from '../../../state_management/redux';

interface RenderFlyoutOptions {
  onClose?: jest.Mock;
  esqlQuery?: string;
  esqlVariables?: Array<{
    key: string;
    value: string | number | Array<string | number>;
    type: ESQLVariableType;
  }>;
}

const renderFlyout = async ({
  onClose = jest.fn(),
  esqlQuery = 'FROM logs* | LIMIT 10',
  esqlVariables,
}: RenderFlyoutOptions = {}) => {
  const services = createDiscoverServicesMock();
  services.history.push('/app/discover');

  const toolkit = getDiscoverInternalStateMock({ services });
  await toolkit.initializeTabs();
  await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

  const tabId = toolkit.getCurrentTab().id;

  toolkit.internalState.dispatch(
    toolkit.injectCurrentTab(internalStateActions.setAppState)({
      appState: { query: { esql: esqlQuery } },
    })
  );

  if (esqlVariables) {
    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.setEsqlVariables)({ esqlVariables })
    );
  }

  render(
    <CreateESQLRuleFlyout
      services={services}
      tabId={tabId}
      getState={toolkit.internalState.getState}
      subscribe={(listener: () => void) => toolkit.internalState.subscribe(listener)}
      onClose={onClose}
    />
  );

  const RuleFormFlyout = services.alertingVTwo!.DynamicRuleFormFlyout as jest.Mock;
  return { services, onClose, toolkit, RuleFormFlyout };
};

describe('CreateESQLRuleFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass the raw ES|QL query to DynamicRuleFormFlyout', async () => {
    const onClose = jest.fn();
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM my_index | WHERE status = "error"',
      onClose,
    });

    expect(RuleFormFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM my_index | WHERE status = "error"',
        onClose,
      }),
      expect.anything()
    );
  });

  it('should pass esqlVariables through to DynamicRuleFormFlyout', async () => {
    const vars = [{ key: 'host', value: 'web-1', type: ESQLVariableType.VALUES }];
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE host == ?host | LIMIT 5',
      esqlVariables: vars,
    });

    const lastCall = RuleFormFlyout.mock.calls.at(-1)?.[0];
    expect(lastCall.query).toBe('FROM logs* | WHERE host == ?host | LIMIT 5');
    expect(lastCall.esqlVariables).toEqual(vars);
  });

  it('should NOT close flyout when query parameters change but pathname stays the same', async () => {
    const { services, onClose } = await renderFlyout();

    act(() => {
      services.history.push('/app/discover?_a=(query:(esql:newQuery))');
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should re-render with updated query when store state changes', async () => {
    const { RuleFormFlyout, toolkit } = await renderFlyout({ esqlQuery: 'FROM logs*' });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'FROM logs*' }),
      expect.anything()
    );

    act(() => {
      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.setAppState)({
          appState: { query: { esql: 'FROM updated_index | LIMIT 5' } },
        })
      );
    });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'FROM updated_index | LIMIT 5' }),
      expect.anything()
    );
  });

  it('should show a danger toast and close when the query is not ES|QL', async () => {
    const services = createDiscoverServicesMock();
    services.history.push('/app/discover');

    const toolkit = getDiscoverInternalStateMock({ services });
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
    const tabId = toolkit.getCurrentTab().id;
    const onClose = jest.fn();

    render(
      <CreateESQLRuleFlyout
        services={services}
        tabId={tabId}
        getState={toolkit.internalState.getState}
        subscribe={(listener: () => void) => toolkit.internalState.subscribe(listener)}
        onClose={onClose}
      />
    );

    expect(services.core.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should close flyout when pathname changes', async () => {
    const { services, onClose } = await renderFlyout();

    act(() => {
      services.history.push('/app/dashboards');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should update esqlVariables when store state changes', async () => {
    const { RuleFormFlyout, toolkit } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE host == ?host | LIMIT 5',
    });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({ esqlVariables: [] }),
      expect.anything()
    );

    act(() => {
      toolkit.internalState.dispatch(
        toolkit.injectCurrentTab(internalStateActions.setEsqlVariables)({
          esqlVariables: [{ key: 'host', value: 'web-2', type: ESQLVariableType.VALUES }],
        })
      );
    });

    const lastCall = RuleFormFlyout.mock.calls.at(-1)?.[0];
    expect(lastCall.esqlVariables).toEqual([
      { key: 'host', value: 'web-2', type: ESQLVariableType.VALUES },
    ]);
  });
});
