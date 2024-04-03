/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildMockDashboard } from '@kbn/dashboard-plugin/public/mocks';
import { DashboardContainerInput } from '@kbn/dashboard-plugin/common';
import { LinksByValueInput } from '../public/embeddable/types';
import { LinksFactoryDefinition } from '../public';
import { LinksAttributes } from './content_management';

jest.mock('../public/services/attribute_service', () => {
  return {
    getLinksAttributeService: jest.fn(() => {
      return {
        saveMethod: jest.fn(),
        unwrapMethod: jest.fn(),
        checkForDuplicateTitle: jest.fn(),
        unwrapAttributes: jest.fn((attributes: LinksByValueInput) => Promise.resolve(attributes)),
        wrapAttributes: jest.fn((attributes: LinksAttributes) => Promise.resolve(attributes)),
      };
    }),
  };
});

export const mockLinksInput = (partial?: Partial<LinksByValueInput>): LinksByValueInput => ({
  id: 'mocked_links_panel',
  attributes: {
    title: 'mocked_links',
  },
  ...(partial ?? {}),
});

export const mockLinksPanel = async ({
  explicitInput,
  dashboardExplicitInput,
}: {
  explicitInput?: Partial<LinksByValueInput>;
  dashboardExplicitInput?: Partial<DashboardContainerInput>;
}) => {
  const dashboardContainer = buildMockDashboard({
    overrides: dashboardExplicitInput,
    savedObjectId: '123',
  });
  const linksFactoryStub = new LinksFactoryDefinition();

  const links = await linksFactoryStub.create(mockLinksInput(explicitInput), dashboardContainer);

  return links;
};
