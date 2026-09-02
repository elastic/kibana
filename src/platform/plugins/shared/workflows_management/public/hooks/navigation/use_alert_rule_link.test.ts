/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useAlertRuleLink } from './use_alert_rule_link';
import { createStartServicesMock, createUseKibanaMockValue } from '../../mocks';
import { useKibana } from '../use_kibana';

jest.mock('../use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useAlertRuleLink', () => {
  beforeEach(() => {
    const services = createStartServicesMock();
    (services.application.getUrlForApp as jest.Mock) = jest.fn(
      (appId: string, { path }: { path: string }) => `/app/${appId}${path}`
    );
    mockUseKibana.mockReturnValue(createUseKibanaMockValue(services));
  });

  it('uses the rule URL from the alert event when available', () => {
    const { result } = renderHook(() =>
      useAlertRuleLink({
        id: 'rule-1',
        name: 'CPU rule',
        ruleUrl: '/s/space-1/app/rules/rule/rule-1',
      })
    );

    expect(result.current).toBe('/s/space-1/app/rules/rule/rule-1');
  });

  it('builds a space-aware application URL from the rule ID as a fallback', () => {
    const { result } = renderHook(() => useAlertRuleLink({ id: 'rule-1', name: 'CPU rule' }));

    expect(result.current).toBe('/app/rules/rule/rule-1');
  });

  it('returns undefined when the execution was not triggered by an alert rule', () => {
    const { result } = renderHook(() => useAlertRuleLink());

    expect(result.current).toBeUndefined();
  });
});
