/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildMockDashboard } from '@kbn/dashboard-plugin/public/mocks';
import { DashboardContainerInput } from '@kbn/dashboard-plugin/common';
import { NavigationEmbeddableByValueInput } from '../public/embeddable/types';
import { NavigationEmbeddableFactoryDefinition } from '../public';
import { NavigationEmbeddableAttributes } from './content_management';

jest.mock('../public/services/attribute_service', () => {
  return {
    getNavigationEmbeddableAttributeService: jest.fn(() => {
      return {
        saveMethod: jest.fn(),
        unwrapMethod: jest.fn(),
        checkForDuplicateTitle: jest.fn(),
        unwrapAttributes: jest.fn((attributes: NavigationEmbeddableByValueInput) =>
          Promise.resolve(attributes)
        ),
        wrapAttributes: jest.fn((attributes: NavigationEmbeddableAttributes) =>
          Promise.resolve(attributes)
        ),
      };
    }),
  };
});

export const mockNavigationEmbeddableInput = (
  partial?: Partial<NavigationEmbeddableByValueInput>
): NavigationEmbeddableByValueInput => ({
  id: 'mocked_links_panel',
  attributes: {
    title: 'mocked_links',
  },
  ...(partial ?? {}),
});

export const mockNavigationEmbeddable = async ({
  explicitInput,
  dashboardExplicitInput,
}: {
  explicitInput?: Partial<NavigationEmbeddableByValueInput>;
  dashboardExplicitInput?: Partial<DashboardContainerInput>;
}) => {
  const dashboardContainer = buildMockDashboard({
    overrides: dashboardExplicitInput,
    savedObjectId: '123',
  });
  const navigationEmbeddableFactoryStub = new NavigationEmbeddableFactoryDefinition();

  const navigationEmbeddable = await navigationEmbeddableFactoryStub.create(
    mockNavigationEmbeddableInput(explicitInput),
    dashboardContainer
  );

  return navigationEmbeddable;
};
