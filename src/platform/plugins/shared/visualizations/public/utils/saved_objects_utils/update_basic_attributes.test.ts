/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { visualizationsClient } from '../../content_management';
import type { BasicVisualizationClient } from '../../vis_types';
import { TypesService } from '../../vis_types/types_service';
import { deleteSOByType } from './update_basic_attributes';

jest.mock('../../content_management', () => ({
  visualizationsClient: { delete: jest.fn() },
}));

describe('deleteSOByType', () => {
  const aliasClient: jest.Mocked<BasicVisualizationClient> = {
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  // The alias registry is shared by every TypesService, so the alias is registered once.
  const typesService = new TypesService();

  beforeAll(() => {
    typesService.setup().registerAlias({
      name: 'aliasType',
      title: 'Alias type',
      icon: 'empty',
      description: 'A type outside content management',
      stage: 'production',
      appExtensions: {
        visualizations: {
          docTypes: ['alias_doc'],
          client: () => aliasClient,
          toListItem: ({ id, type }) => ({
            id,
            title: id,
            icon: 'empty',
            typeTitle: 'Alias type',
            stage: 'production',
            savedObjectType: type,
          }),
        },
      },
    });
  });

  const getDependencies = () => {
    const { overlays, http } = coreMock.createStart();
    return {
      typesService: typesService.start(),
      contentManagement: contentManagementMock.createStartContract(),
      overlays,
      http,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aliasClient.delete.mockResolvedValue({ success: true });
    jest.mocked(visualizationsClient.delete).mockResolvedValue({ success: true });
  });

  it('deletes an alias type through its own client', async () => {
    await deleteSOByType('item-1', 'alias_doc', getDependencies());

    expect(aliasClient.delete).toHaveBeenCalledWith('item-1');
    expect(visualizationsClient.delete).not.toHaveBeenCalled();
  });

  it('deletes other types through the visualizations client', async () => {
    await deleteSOByType('item-1', 'visualization', getDependencies());

    expect(visualizationsClient.delete).toHaveBeenCalledWith('item-1');
    expect(aliasClient.delete).not.toHaveBeenCalled();
  });

  it('throws when the delete does not succeed', async () => {
    aliasClient.delete.mockResolvedValue({ success: false });

    await expect(deleteSOByType('item-1', 'alias_doc', getDependencies())).rejects.toThrow();
  });
});
