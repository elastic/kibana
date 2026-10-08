/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ApplicationStart, DocLinksStart } from '@kbn/core/public';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import type { VisParams } from '@kbn/visualizations-common';
import type { TypesStart, BaseVisType, VisTypeOnCreate } from '../vis_types';
import { VisGroups } from '../vis_types';
import NewVisModal from './new_vis_modal';
import type { TypeSelectionProps } from './new_vis_modal';

describe('NewVisModal with a visualization type that implements onCreate', () => {
  const onCreate = jest.fn<ReturnType<VisTypeOnCreate>, Parameters<VisTypeOnCreate>>();
  const visTypesList = [
    {
      name: 'visWithOnCreate',
      title: 'Vis with onCreate',
      group: VisGroups.PROMOTED,
      stage: 'production',
      disableCreate: false,
      disableEdit: false,
      requiresSearch: false,
      onCreate: (options) => onCreate(options),
    },
  ] as BaseVisType[];
  const visTypesRegistry: TypesStart = {
    async get<T extends VisParams>(id: string) {
      return visTypesList.find((vis) => vis.name === id) as unknown as BaseVisType<T>;
    },
    all: async () => visTypesList,
    getAliases: () => [],
    unRegisterAlias: () => [],
    getByGroup: async (group: VisGroups) => visTypesList.filter((type) => type.group === group),
  };
  const contentManagement = contentManagementMock.createStartContract();

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        assign: jest.fn(),
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderModal = (propsOverrides?: Partial<TypeSelectionProps>) =>
    render(
      <EuiThemeProvider>
        <I18nProvider>
          <NewVisModal
            isOpen={true}
            onClose={() => null}
            visTypesRegistry={visTypesRegistry}
            addBasePath={(url: string) => `testbasepath${url}`}
            uiSettings={{ get: jest.fn() } as unknown as TypeSelectionProps['uiSettings']}
            application={{} as ApplicationStart}
            docLinks={{ links: { visualize: { guide: 'test' } } } as unknown as DocLinksStart}
            contentClient={contentManagement.client}
            {...propsOverrides}
          />
        </I18nProvider>
      </EuiThemeProvider>
    );

  it('opens the editor in place and skips the default creation flow when handled', async () => {
    onCreate.mockResolvedValue(true);
    const onClose = jest.fn();
    renderModal({ onClose });

    await userEvent.click(await screen.findByText('Vis with onCreate'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('notifies the host when the in-place editor closes', async () => {
    onCreate.mockImplementation(async ({ onEditorClose }) => {
      onEditorClose();
      return true;
    });
    const onCreateEditorClose = jest.fn();
    renderModal({ onCreateEditorClose });

    await userEvent.click(await screen.findByText('Vis with onCreate'));

    await waitFor(() => expect(onCreateEditorClose).toHaveBeenCalledTimes(1));
  });

  it('falls back to the default creation flow when not handled', async () => {
    onCreate.mockResolvedValue(false);
    const onClose = jest.fn();
    renderModal({ onClose });

    await userEvent.click(await screen.findByText('Vis with onCreate'));

    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith(
        'testbasepath/app/visualize#/create?type=visWithOnCreate'
      )
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
