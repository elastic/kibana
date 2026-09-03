/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowRunAsFlyout } from './workflow_run_as_flyout';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { selectYamlString } from '../../../entities/workflows/store/workflow_detail/selectors';
import { setYamlString } from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

const mockHttpGet = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        get: mockHttpGet,
      },
    },
  }),
}));

describe('WorkflowRunAsFlyout', () => {
  beforeEach(() => {
    mockHttpGet.mockReset();
    mockHttpGet.mockImplementation(() => new Promise(() => {}));
  });

  it('writes the selected service-account id to workflow YAML', () => {
    const store = createMockStore();
    store.dispatch(
      setYamlString(`name: Test workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: log
    type: console
    with:
      message: test
`)
    );
    const onClose = jest.fn();

    render(
      <TestWrapper store={store}>
        <WorkflowRunAsFlyout onClose={onClose} />
      </TestWrapper>
    );

    fireEvent.change(screen.getByTestId('workflowRunAsId'), {
      target: { value: 'service-account-1' },
    });
    fireEvent.click(screen.getByTestId('workflowRunAsApply'));

    expect(selectYamlString(store.getState())).toContain('settings:\n  run_as: service-account-1');
    expect(onClose).toHaveBeenCalled();
  });
});
