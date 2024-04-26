/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dashboardPluginMock } from '@kbn/dashboard-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { PresentationContainer } from '@kbn/presentation-containers';
import { BehaviorSubject } from 'rxjs';
import { setKibanaServices } from './services/kibana_services';
import { DASHBOARD_LINK_TYPE, LinksAttributes } from '../common/content_management';
import { LinksApi, ResolvedLink } from './embeddable/types';

export const setStubKibanaServices = () => {
  const mockCore = coreMock.createStart();

  const core = {
    ...mockCore,
    application: {
      ...mockCore.application,
      capabilities: {
        ...mockCore.application.capabilities,
        visualize: {
          save: true,
        },
      },
    },
  };

  setKibanaServices(core, {
    dashboard: dashboardPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    contentManagement: contentManagementMock.createStartContract(),
    presentationUtil: presentationUtilPluginMock.createStartContract(core),
    uiActions: uiActionsPluginMock.createStartContract(),
  });
};

export const getMockLinksApi = ({
  attributes,
  savedObjectId,
  parentApi,
}: {
  attributes?: LinksAttributes;
  savedObjectId?: string;
  parentApi: PresentationContainer;
}): LinksApi => {
  return {
    parentApi,
    type: 'links',
    uuid: 'mock-uuid',
    unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
    resetUnsavedChanges: jest.fn(),
    serializeState: jest.fn(),
    onEdit: jest.fn(),
    isEditingEnabled: () => true,
    getTypeDisplayName: () => 'Links',
    canLinkToLibrary: async () => savedObjectId === undefined,
    canUnlinkFromLibrary: async () => savedObjectId !== undefined,
    checkForDuplicateTitle: jest.fn(),
    saveToLibrary: jest.fn(),
    getByReferenceState: jest.fn(),
    getByValueState: jest.fn(),
    attributes$: new BehaviorSubject<LinksAttributes | undefined>({
      title: 'Mock links',
      description: 'Mock links description',
      ...attributes,
    }),
    resolvedLinks$: new BehaviorSubject<ResolvedLink[]>(
      attributes?.links?.map((link, i) => ({
        ...link,
        title: link.label ?? `Link ${i}`,
        description: link.type === DASHBOARD_LINK_TYPE ? `Description ${i}` : undefined,
      })) ?? []
    ),
    savedObjectId$: new BehaviorSubject(savedObjectId),
  };
};
