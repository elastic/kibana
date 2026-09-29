/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { getInspectedElementData } from './get_inspected_element_data';
import { fetchComponentData } from '../api/fetch_component_data';
import { getIconType } from './dom/get_icon_type';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { findFirstEuiComponent } from './fiber/find_first_eui_component';

vi.mock('../api/fetch_component_data');
vi.mock('./dom/get_icon_type');
vi.mock('./fiber/find_first_eui_component');

describe('getInspectedElementData', () => {
  const mockHttpService = httpServiceMock.createStartContract();

  const mockSourceComponent = {
    type: 'EuiButton',
    element: document.createElement('button'),
  };

  const mockTarget = document.createElement('p');

  const mockTargetFiberNode = {
    type: 'p',
    element: mockTarget,
    _debugSource: {
      fileName: '/path/to/capybara.tsx',
      lineNumber: 42,
      columnNumber: 10,
    },
    _debugOwner: null,
  };

  const mockResponse = {
    baseFileName: 'capybara.tsx',
    relativePath: 'src/path/to/capybara.tsx',
    codeowners: ['@elastic/team-capybara'],
  };

  const mockEuiDocs = {
    componentType: 'EuiButton',
    docsLink: 'https://eui.elastic.co/docs/components/navigation/buttons/button',
    iconType: 'copy',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if targetFiberNodeWithHtmlElement is null', async () => {
    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      targetFiberNode: null,
    });

    expect(result).toBeNull();
  });

  it('should return null if sourceComponent is null', async () => {
    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: null,
      targetFiberNode: mockTargetFiberNode,
    });

    expect(result).toBeNull();
  });

  it('should return null if no component data fetched', async () => {
    (fetchComponentData as Mock).mockResolvedValue(null);

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      targetFiberNode: mockTargetFiberNode,
    });

    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockTargetFiberNode?._debugSource.fileName,
    });

    expect(result).toBeNull();
  });

  it('should return component data', async () => {
    (fetchComponentData as Mock).mockResolvedValue(mockResponse);
    (getIconType as Mock).mockReturnValue('copy');
    (findFirstEuiComponent as Mock).mockReturnValue('EuiButton');

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      targetFiberNode: mockTargetFiberNode,
    });

    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockTargetFiberNode._debugSource.fileName,
    });
    expect(getIconType).toHaveBeenCalledWith(mockTarget);

    expect(result).toEqual({
      fileData: {
        ...mockTargetFiberNode._debugSource,
        ...mockResponse,
      },
      euiData: mockEuiDocs,
      sourceComponent: mockSourceComponent,
    });
  });
});
