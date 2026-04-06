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
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { CreateESQLRuleFlyout } from './create_esql_rule_flyout';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import type { AppMenuExtensionParams } from '../../../../../context_awareness';
import { internalStateActions } from '../../../state_management/redux';

const discoverParamsMock: AppMenuExtensionParams = {
  dataView: dataViewMock,
  adHocDataViews: [],
  isEsqlMode: true,
  authorizedRuleTypeIds: [ES_QUERY_ID],
  actions: { updateAdHocDataViews: jest.fn() },
};

const renderFlyout = async ({
  onClose = jest.fn(),
  esqlQuery = 'FROM logs* | LIMIT 10',
}: { onClose?: jest.Mock; esqlQuery?: string } = {}) => {
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

  render(
    <CreateESQLRuleFlyout
      discoverParams={discoverParamsMock}
      services={services}
      tabId={tabId}
      getState={toolkit.internalState.getState}
      onClose={onClose}
    />
  );

  return { services, onClose };
};

describe('CreateESQLRuleFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render DynamicRuleFormFlyout with the current ES|QL query', async () => {
    const services = createDiscoverServicesMock();
    services.history.push('/app/discover');
    const RuleFormFlyout = services.alertingVTwo!.DynamicRuleFormFlyout as jest.Mock;

    const toolkit = getDiscoverInternalStateMock({ services });
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
    const tabId = toolkit.getCurrentTab().id;

    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.setAppState)({
        appState: { query: { esql: 'FROM my_index | WHERE status = "error"' } },
      })
    );

    const onClose = jest.fn();

    render(
      <CreateESQLRuleFlyout
        discoverParams={discoverParamsMock}
        services={services}
        tabId={tabId}
        getState={toolkit.internalState.getState}
        onClose={onClose}
      />
    );

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

  it('should close flyout when pathname changes', async () => {
    const { services, onClose } = await renderFlyout();

    act(() => {
      services.history.push('/app/dashboards');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
