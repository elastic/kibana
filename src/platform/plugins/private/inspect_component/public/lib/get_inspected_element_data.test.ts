/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { ElementFiber } from '@kbn/react-fiber';
import { getInspectedElementData } from './get_inspected_element_data';
import { fetchComponentData } from '../api/fetch_component_data';
import { getIconType } from './dom/get_icon_type';

jest.mock('../api/fetch_component_data');
jest.mock('./dom/get_icon_type');

describe('getInspectedElementData', () => {
  const mockHttpService = httpServiceMock.createStartContract();

  const mockSourceComponent = {
    type: 'EuiButton',
    element: document.createElement('button'),
  };

  const mockElement = document.createElement('p');

  const mockTarget: ElementFiber = {
    element: mockElement,
    fiber: {
      type: 'p',
      _debugOwner: { type: { displayName: 'EuiButton' } },
    },
    source: {
      fileName: '/path/to/capybara.tsx',
      lineNumber: 42,
      columnNumber: 10,
    },
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

  it('should return null if target is null', async () => {
    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      target: null,
    });

    expect(result).toBeNull();
  });

  it('should return null if sourceComponent is null', async () => {
    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: null,
      target: mockTarget,
    });

    expect(result).toBeNull();
  });

  it('should return null if no component data fetched', async () => {
    (fetchComponentData as jest.Mock).mockResolvedValue(null);

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      target: mockTarget,
    });

    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockTarget.source.fileName,
    });

    expect(result).toBeNull();
  });

  it('should return component data', async () => {
    (fetchComponentData as jest.Mock).mockResolvedValue(mockResponse);
    (getIconType as jest.Mock).mockReturnValue('copy');

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      sourceComponent: mockSourceComponent,
      target: mockTarget,
    });

    expect(getIconType).toHaveBeenCalledWith(mockElement);

    expect(result).toEqual({
      fileData: {
        ...mockTarget.source,
        ...mockResponse,
      },
      euiData: mockEuiDocs,
      sourceComponent: mockSourceComponent,
    });
  });
});
