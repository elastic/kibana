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
import type { ReactFiberNodeWithHtmlElement } from './fiber/types';

jest.mock('../api/fetch_component_data');
jest.mock('./dom/get_icon_type');

describe('getInspectedElementData', () => {
  const mockHttpService = httpServiceMock.createStartContract();

  const mockTarget = document.createElement('div');
  const mockSourceComponent = {
    type: 'EuiButton',
    element: document.createElement('button'),
  };

  const mockTargetFiberNodeWithHtmlElement: ReactFiberNodeWithHtmlElement = {
    elementType: 'button',
    type: 'EuiButton',
    _debugSource: {
      fileName: '/path/to/component.tsx',
      lineNumber: 42,
      columnNumber: 10,
    },
    _debugOwner: undefined,
    stateNode: mockTarget,
    child: undefined,
    sibling: undefined,
    return: undefined,
    element: mockTarget,
  };

  const mockResponse = {
    baseFileName: 'component.tsx',
    relativePath: 'src/path/to/component.tsx',
    codeowners: ['team-kibana', 'team-platform'],
  };

  const mockEuiDocs = {
    componentName: 'EuiButton',
    docsLink: 'https://eui.elastic.co/docs/components/navigation/buttons/button',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null if targetFiberNodeWithHtmlElement is null', async () => {
    const result = await getInspectedElementData({
      httpService: mockHttpService,
      target: mockTarget,
      sourceComponent: mockSourceComponent,
      targetFiberNodeWithHtmlElement: null,
    });

    expect(result).toBeNull();
  });

  it('should return null if sourceComponent is null', async () => {
    const result = await getInspectedElementData({
      httpService: mockHttpService,
      target: mockTarget,
      sourceComponent: null,
      targetFiberNodeWithHtmlElement: mockTargetFiberNodeWithHtmlElement,
    });

    expect(result).toBeNull();
  });

  it('should return null if no component data fetched', async () => {
    (fetchComponentData as jest.Mock).mockResolvedValue(null);

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      target: mockTarget,
      sourceComponent: mockSourceComponent,
      targetFiberNodeWithHtmlElement: mockTargetFiberNodeWithHtmlElement,
    });

    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockTargetFiberNodeWithHtmlElement._debugSource.fileName,
    });
    expect(result).toBeNull();
  });

  it('should return complete component data when all sources return data', async () => {
    (fetchComponentData as jest.Mock).mockResolvedValue(mockResponse);
    (getIconType as jest.Mock).mockReturnValue('copy');

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      target: mockTarget,
      sourceComponent: mockSourceComponent,
      targetFiberNodeWithHtmlElement: mockTargetFiberNodeWithHtmlElement,
    });

    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockTargetFiberNodeWithHtmlElement._debugSource.fileName,
    });
    expect(getIconType).toHaveBeenCalledWith(mockTarget);

    expect(result).toEqual({
      ...mockTargetFiberNodeWithHtmlElement,
      ...mockResponse,
      iconType: 'copy',
      euiData: mockEuiDocs,
      sourceComponent: mockSourceComponent,
    });
  });
});
