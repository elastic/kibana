/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG } from '@kbn/workflows';
import { useWorkflowYamlValidationContext } from './use_workflow_yaml_validation_context';
import { useKibana } from '../../../hooks/use_kibana';

jest.mock('../../../hooks/use_kibana');
jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: () => undefined,
}));
jest.mock(
  '../../../widgets/workflow_yaml_editor/lib/esql_validation/use_workflow_esql_callbacks',
  () => ({
    useWorkflowEsqlCallbacks: () => ({}),
  })
);
jest.mock('./property_handlers/use_get_property_handler', () => ({
  useGetPropertyHandler: () => () => undefined,
}));
jest.mock('react-redux-v7', () => ({
  useSelector: jest.fn(() => ({ status: 'loading', workflows: {}, totalWorkflows: 0 })),
}));

describe('useWorkflowYamlValidationContext', () => {
  it('subscribes to the self-client flag with useBooleanValue', () => {
    const useBooleanValue = jest.fn().mockReturnValue(true);
    const getBooleanValue = jest.fn().mockReturnValue(false);
    jest.mocked(useKibana).mockReturnValue({
      services: {
        application: { getUrlForApp: jest.fn(() => 'https://example.test') },
        http: {},
        data: {},
        licensing: {},
        workflowsExtensions: {},
        featureFlags: {
          useBooleanValue,
          getBooleanValue,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result, rerender } = renderHook(() => useWorkflowYamlValidationContext());

    expect(getBooleanValue).not.toHaveBeenCalled();
    expect(useBooleanValue).toHaveBeenCalledWith(WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG, false);
    expect(result.current.warnIgnoredKibanaFetcher).toBe(true);

    useBooleanValue.mockReturnValue(false);
    rerender();
    expect(result.current.warnIgnoredKibanaFetcher).toBe(false);
  });
});
