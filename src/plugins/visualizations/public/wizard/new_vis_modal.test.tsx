/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { TypesStart, VisGroups, BaseVisType } from '../vis_types';
import NewVisModal, { TypeSelectionProps } from './new_vis_modal';
import { ApplicationStart, DocLinksStart } from '@kbn/core/public';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { VisParams } from '../../common';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';

describe('NewVisModal', () => {
  const defaultVisTypeParams = {
    disableCreate: false,
    disableEdit: false,
    requiresSearch: false,
  };
  const _visTypes = [
    {
      name: 'vis',
      title: 'Vis Type 1',
      stage: 'production',
      group: VisGroups.PROMOTED,
      ...defaultVisTypeParams,
    },
    {
      name: 'vis2',
      title: 'Vis Type 2',
      group: VisGroups.PROMOTED,
      stage: 'production',
      ...defaultVisTypeParams,
    },
    {
      name: 'vis3',
      title: 'Vis3',
      stage: 'production',
      group: VisGroups.TOOLS,
      ...defaultVisTypeParams,
    },
    {
      name: 'visWithAliasUrl',
      title: 'Vis with alias Url',
      stage: 'production',
      group: VisGroups.PROMOTED,
      alias: {
        app: 'otherApp',
        path: '#/aliasUrl',
      },
    },
    {
      name: 'visWithSearch',
      title: 'Vis with search',
      group: VisGroups.AGGBASED,
      stage: 'production',
      ...defaultVisTypeParams,
    },
  ] as BaseVisType[];
  const visTypes: TypesStart = {
    get<T extends VisParams>(id: string): BaseVisType<T> {
      return _visTypes.find((vis) => vis.name === id) as unknown as BaseVisType<T>;
    },
    all: () => _visTypes,
    getAliases: () => [],
    unRegisterAlias: () => [],
    getByGroup: (group: VisGroups) => _visTypes.filter((type) => type.group === group),
  };
  const addBasePath = (url: string) => `testbasepath${url}`;
  const settingsGet = jest.fn();
  const uiSettings: any = { get: settingsGet };
  const docLinks = {
    links: {
      visualize: {
        guide: 'test',
      },
    },
  } as unknown as DocLinksStart;

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

  const renderNewVisModal = (propsOverrides?: Partial<TypeSelectionProps>) => {
    return render(
      <I18nProvider>
        <NewVisModal
          isOpen={true}
          onClose={() => null}
          visTypesRegistry={visTypes}
          addBasePath={addBasePath}
          uiSettings={uiSettings}
          application={{} as ApplicationStart}
          docLinks={docLinks}
          contentClient={contentManagement.client}
          {...propsOverrides}
        />
      </I18nProvider>
    );
  };

  it('should show the aggbased group but not the visualization assigned to this group', async () => {
    renderNewVisModal();
    expect(screen.queryByText('Aggregation-based')).not.toBeInTheDocument();
    expect(screen.queryByText('Vis with search')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Legacy/i }));
    expect(screen.queryByText('Aggregation-based')).toBeInTheDocument();
    expect(screen.queryByText('Vis with search')).not.toBeInTheDocument();
  });

  it('should display the visualizations of the other group', () => {
    renderNewVisModal();
    expect(screen.queryByText('Vis Type 2')).toBeInTheDocument();
  });

  describe('open editor', () => {
    it('should open the editor for visualizations without search', async () => {
      renderNewVisModal();
      await userEvent.click(screen.getByText('Vis Type 1'));
      expect(window.location.assign).toBeCalledWith('testbasepath/app/visualize#/create?type=vis');
    });

    it('passes through editor params to the editor URL', async () => {
      renderNewVisModal({
        editorParams: ['foo=true', 'bar=42'],
      });
      await userEvent.click(screen.getByText('Vis Type 1'));
      expect(window.location.assign).toBeCalledWith(
        'testbasepath/app/visualize#/create?type=vis&foo=true&bar=42'
      );
    });

    it('closes and redirects properly if visualization with alias.path and originatingApp in props', async () => {
      const onClose = jest.fn();
      const navigateToApp = jest.fn();
      const stateTransfer = embeddablePluginMock.createStartContract().getStateTransfer();
      renderNewVisModal({
        editorParams: ['foo=true', 'bar=42'],
        onClose,
        application: { navigateToApp } as unknown as ApplicationStart,
        originatingApp: 'coolJestTestApp',
        stateTransfer,
      });
      await userEvent.click(screen.getByText('Vis with alias Url'));
      expect(stateTransfer.navigateToEditor).toBeCalledWith('otherApp', {
        path: '#/aliasUrl',
        state: { originatingApp: 'coolJestTestApp' },
      });
      expect(onClose).toHaveBeenCalled();
    });

    it('closes and redirects properly if visualization with aliasApp and without originatingApp in props', async () => {
      const onClose = jest.fn();
      const navigateToApp = jest.fn();

      renderNewVisModal({
        editorParams: ['foo=true', 'bar=42'],
        onClose,
        application: { navigateToApp } as unknown as ApplicationStart,
      });
      await userEvent.click(screen.getByText('Vis with alias Url'));
      expect(navigateToApp).toBeCalledWith('otherApp', { path: '#/aliasUrl' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('aggBased visualizations', () => {
    it('should render as expected', async () => {
      renderNewVisModal();
      await userEvent.click(screen.getByRole('tab', { name: /Legacy/i }));
      expect(screen.queryByText('Aggregation-based')).toBeInTheDocument();
      await userEvent.click(screen.getByText('Aggregation-based'));
      expect(screen.queryByText('Vis with search')).toBeInTheDocument();
    });
  });
});
