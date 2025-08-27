/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getInspectedElementData } from './get_inspected_element_data';
import { fetchComponentData } from '../api/fetch_component_data';
import { getIconType } from './dom/get_icon_type';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { findFirstEuiComponent } from './fiber/find_first_eui_component';
import type { ReactFiberNodeWithHtmlElement } from './fiber/types';

jest.mock('../api/fetch_component_data');
jest.mock('./dom/get_icon_type');
jest.mock('./fiber/find_first_eui_component');

describe('getInspectedElementData', () => {
  const mockHttpService = httpServiceMock.createStartContract();

  const mockSourceComponent = {
    type: 'EuiButton',
    element: document.createElement('button'),
  };

  const mockTarget = document.createElement('p');

  const mockTargetFiberNodeWithHtmlElement: ReactFiberNodeWithHtmlElement = {
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
    jest.clearAllMocks();
  });

  it('should return null if targetFiberNodeWithHtmlElement is null', async () => {
    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      targetFiberNodeWithHtmlElement: null,
    });

    expect(result).toBeNull();
  });

  it('should return null if sourceComponent is null', async () => {
    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: null,
      targetFiberNodeWithHtmlElement: mockTargetFiberNodeWithHtmlElement,
    });

    expect(result).toBeNull();
  });

  it('should return null if no component data fetched', async () => {
    (fetchComponentData as jest.Mock).mockResolvedValue(null);

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      targetFiberNodeWithHtmlElement: mockTargetFiberNodeWithHtmlElement,
    });

    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockTargetFiberNodeWithHtmlElement._debugSource.fileName,
    });

    expect(result).toBeNull();
  });

  it('should return component data', async () => {
    (fetchComponentData as jest.Mock).mockResolvedValue(mockResponse);
    (getIconType as jest.Mock).mockReturnValue('copy');
    (findFirstEuiComponent as jest.Mock).mockReturnValue('EuiButton');

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      targetFiberNodeWithHtmlElement: mockTargetFiberNodeWithHtmlElement,
    });

    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockTargetFiberNodeWithHtmlElement._debugSource.fileName,
    });
    expect(getIconType).toHaveBeenCalledWith(mockTarget);

    expect(result).toEqual({
      fileData: {
        ...mockTargetFiberNodeWithHtmlElement._debugSource,
        ...mockResponse,
      },
      euiData: mockEuiDocs,
      sourceComponent: mockSourceComponent,
    });
  });
});
