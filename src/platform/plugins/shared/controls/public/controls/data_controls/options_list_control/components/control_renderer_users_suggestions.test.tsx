/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { fireEvent, render as rtlRender, waitFor } from '@testing-library/react';
import { getOptionsListContextMock } from '../../mocks/api_mocks';
import { NO_ASSIGNEES_OPTION_KEY } from '../constants';
import { OptionsListControlContext } from '../options_list_context_provider';
import { UsersSuggestions } from './control_renderer_users_suggestions';

const mockHttpFetch = jest.fn();
jest.mock('../../../../services/kibana_services', () => {
  return {
    coreServices: {
      http: {
        fetch: (...args: unknown[]) => mockHttpFetch(...args),
      },
    },
  };
});

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: EuiThemeProvider });

describe('UsersSuggestions', () => {
  const mountComponent = (selectedOptions: Array<string | number> = []) => {
    const contextMock = getOptionsListContextMock();
    (
      contextMock.componentApi.fieldName$ as unknown as {
        next: (value: string) => void;
      }
    ).next('kibana.alert.workflow_assignee_ids');
    contextMock.componentApi.setSelectedOptions(selectedOptions);

    const rendered = render(
      <OptionsListControlContext.Provider
        value={{
          componentApi: contextMock.componentApi,
          displaySettings: contextMock.displaySettings,
        }}
      >
        <UsersSuggestions />
      </OptionsListControlContext.Provider>
    );

    return { contextMock, rendered };
  };

  beforeEach(() => {
    mockHttpFetch.mockReset();
    mockHttpFetch.mockResolvedValue([]);
  });

  it('shows and selects "No assignees" option', async () => {
    const { rendered, contextMock } = mountComponent();

    const noAssigneesOption = await rendered.findByTestId(
      'optionsList-control-selection-no-assignees'
    );
    fireEvent.click(noAssigneesOption);

    expect(contextMock.componentApi.makeSelection).toHaveBeenCalledWith(
      NO_ASSIGNEES_OPTION_KEY,
      false
    );
  });

  it('shows "No assignees" as checked when already selected', async () => {
    const { rendered } = mountComponent([NO_ASSIGNEES_OPTION_KEY]);

    await waitFor(() => {
      expect(
        rendered
          .getByTestId('optionsList-control-selection-no-assignees')
          .closest('[aria-checked="true"]')
      ).toBeTruthy();
    });
  });

  it('renders display name and email for user suggestions', async () => {
    mockHttpFetch.mockResolvedValueOnce([
      {
        uid: 'uid-1',
        enabled: true,
        user: { username: 'user1', full_name: 'User One', email: 'user1@example.com' },
        data: { avatar: {} },
      },
    ]);

    const { rendered } = mountComponent();

    await waitFor(() => {
      expect(mockHttpFetch).toHaveBeenCalledWith(
        '/internal/detection_engine/users/_find',
        expect.anything()
      );
      expect(rendered.getByText('User One')).toBeInTheDocument();
      expect(rendered.getByText('user1@example.com')).toBeInTheDocument();
    });
  });

  it('does not render duplicate email when it matches display name', async () => {
    mockHttpFetch.mockResolvedValueOnce([
      {
        uid: 'uid-2',
        enabled: true,
        user: { username: 'user2', full_name: 'dupe@example.com', email: 'dupe@example.com' },
        data: { avatar: {} },
      },
    ]);

    const { rendered } = mountComponent();

    await waitFor(() => {
      expect(mockHttpFetch).toHaveBeenCalledWith(
        '/internal/detection_engine/users/_find',
        expect.anything()
      );
      expect(rendered.getAllByText('dupe@example.com')).toHaveLength(1);
    });
  });
});
