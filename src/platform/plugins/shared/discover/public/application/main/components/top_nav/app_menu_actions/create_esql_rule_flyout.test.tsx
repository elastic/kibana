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

  it('should render DynamicRuleFormFlyout with the current ES|QL query', async () => {
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
    // No ES|QL query dispatched — tab stays in its default (non-ES|QL) state.
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

  it('should inline bound `?param` Controls into the query passed to the rule form', async () => {
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE host == ?host | LIMIT 5',
      esqlVariables: [{ key: 'host', value: 'web-1', type: ESQLVariableType.VALUES }],
    });

    const lastCall = RuleFormFlyout.mock.calls.at(-1)?.[0];
    expect(lastCall.query).toContain('"web-1"');
    expect(lastCall.query).not.toContain('?host');
    expect(lastCall.validationErrors).toEqual([]);
  });

  it('should forward unresolved `?param` names as validationErrors', async () => {
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE host == ?host AND env == ?env | LIMIT 5',
      esqlVariables: [{ key: 'host', value: 'web-1', type: ESQLVariableType.VALUES }],
    });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({ validationErrors: ['?env'] }),
      expect.anything()
    );
  });

  it('should re-evaluate inlined query and validationErrors when esqlVariables change', async () => {
    const { RuleFormFlyout, toolkit } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE host == ?host | LIMIT 5',
    });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({ validationErrors: ['?host'] }),
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
    expect(lastCall.query).toContain('"web-2"');
    expect(lastCall.validationErrors).toEqual([]);
  });

  it('should inline `??field` identifier Controls via Composer (no ??token left)', async () => {
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | KEEP ??col | LIMIT 5',
      esqlVariables: [{ key: 'col', value: 'message', type: ESQLVariableType.FIELDS }],
    });

    const lastCall = RuleFormFlyout.mock.calls.at(-1)?.[0];
    expect(lastCall.query).toContain('message');
    expect(lastCall.query).not.toContain('??col');
    expect(lastCall.validationErrors).toEqual([]);
  });

  it('should inline non-empty homogeneous `multi_values` Controls as a list literal', async () => {
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE env IN (?envs) | LIMIT 5',
      esqlVariables: [
        { key: 'envs', value: ['prod', 'staging'], type: ESQLVariableType.MULTI_VALUES },
      ],
    });

    const lastCall = RuleFormFlyout.mock.calls.at(-1)?.[0];
    expect(lastCall.query).toContain('"prod"');
    expect(lastCall.query).toContain('"staging"');
    expect(lastCall.query).not.toContain('?envs');
    expect(lastCall.validationErrors).toEqual([]);
  });

  it('should treat empty `multi_values` as unresolved', async () => {
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE env IN (?envs) | LIMIT 5',
      esqlVariables: [{ key: 'envs', value: [], type: ESQLVariableType.MULTI_VALUES }],
    });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validationErrors: ['?envs'],
        query: 'FROM logs* | WHERE env IN (?envs) | LIMIT 5',
      }),
      expect.anything()
    );
  });

  it('should treat mixed-type `multi_values` as unresolved (Composer rejects heterogeneous lists)', async () => {
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE x IN (?mixed) | LIMIT 5',
      esqlVariables: [{ key: 'mixed', value: ['a', 1], type: ESQLVariableType.MULTI_VALUES }],
    });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validationErrors: ['?mixed'],
        query: 'FROM logs* | WHERE x IN (?mixed) | LIMIT 5',
      }),
      expect.anything()
    );
  });

  it('should treat `time_literal` Controls as unresolved (Composer cannot inline durations without quoting)', async () => {
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE @timestamp > NOW() - ?duration | LIMIT 5',
      esqlVariables: [{ key: 'duration', value: '15m', type: ESQLVariableType.TIME_LITERAL }],
    });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validationErrors: ['?duration'],
        query: 'FROM logs* | WHERE @timestamp > NOW() - ?duration | LIMIT 5',
      }),
      expect.anything()
    );
  });

  it('should treat a `?param` with no matching Control as unresolved', async () => {
    const { RuleFormFlyout } = await renderFlyout({
      esqlQuery: 'FROM logs* | WHERE @timestamp > NOW() - ?new | LIMIT 20',
      // Controls exist, but none with key 'new'
      esqlVariables: [{ key: 'mytest', value: '15m', type: ESQLVariableType.TIME_LITERAL }],
    });

    expect(RuleFormFlyout).toHaveBeenLastCalledWith(
      expect.objectContaining({
        validationErrors: ['?new'],
        query: 'FROM logs* | WHERE @timestamp > NOW() - ?new | LIMIT 20',
      }),
      expect.anything()
    );
  });
});
