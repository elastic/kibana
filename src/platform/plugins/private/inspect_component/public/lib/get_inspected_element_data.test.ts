/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getInspectedElementData } from './get_inspected_element_data';
import { findDebugSource } from './fiber/find_debug_source';
import { fetchComponentData } from '../api/fetch_component_data';
import { getIconType } from './dom/get_icon_type';
import { getEuiComponentDocsData } from './eui/get_eui_component_docs_data';
import { EUI_DOCS_BASE } from './constants';
import { httpServiceMock } from '@kbn/core/public/mocks';

jest.mock('./fiber/find_debug_source');
jest.mock('../api/fetch_component_data');
jest.mock('./dom/get_icon_type');
jest.mock('./eui/get_eui_component_docs_data');

describe('getInspectedElementData', () => {
  const mockHttpService = httpServiceMock.createStartContract();

  const mockTarget = document.createElement('div');
  const mockComponentPath = 'EuiButton/EuiButtonDisplay';
  const mockSourceComponent = 'EuiButton';

  const mockFileData = {
    fileName: '/path/to/component.tsx',
    lineNumber: 42,
    columnNumber: 10,
  };

  const mockResponse = {
    baseFileName: 'component.tsx',
    relativePath: 'src/path/to/component.tsx',
    codeowners: ['team-kibana', 'team-platform'],
  };

  const mockEuiDocs = {
    componentName: 'EuiButton',
    docsLink: 'https://elastic.github.io/eui/#/components/button',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined if no debug source found', async () => {
    (findDebugSource as jest.Mock).mockReturnValue(undefined);

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      target: mockTarget,
    });

    expect(findDebugSource).toHaveBeenCalledWith(mockTarget);
    expect(result).toBeUndefined();
  });

  it('should return undefined if no component data fetched', async () => {
    (findDebugSource as jest.Mock).mockReturnValue(mockFileData);
    (fetchComponentData as jest.Mock).mockResolvedValue(undefined);

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      target: mockTarget,
    });

    expect(findDebugSource).toHaveBeenCalledWith(mockTarget);
    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockFileData.fileName,
    });
    expect(result).toBeUndefined();
  });

  it('should return component data with default EUI data when no EUI docs found', async () => {
    (findDebugSource as jest.Mock).mockReturnValue(mockFileData);
    (fetchComponentData as jest.Mock).mockResolvedValue(mockResponse);
    (getIconType as jest.Mock).mockReturnValue('copy');
    (getEuiComponentDocsData as jest.Mock).mockReturnValue(undefined);

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      target: mockTarget,
      componentPath: mockComponentPath,
      sourceComponent: mockSourceComponent,
    });

    expect(findDebugSource).toHaveBeenCalledWith(mockTarget);
    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockFileData.fileName,
    });
    expect(getIconType).toHaveBeenCalledWith(mockTarget);
    expect(getEuiComponentDocsData).toHaveBeenCalledWith(mockComponentPath);

    expect(result).toEqual({
      ...mockFileData,
      ...mockResponse,
      iconType: 'copy',
      euiData: {
        componentName: 'N/A',
        docsLink: `${EUI_DOCS_BASE}/components`,
      },
      sourceComponent: mockSourceComponent,
    });
  });

  it('should return complete component data when all sources return data', async () => {
    (findDebugSource as jest.Mock).mockReturnValue(mockFileData);
    (fetchComponentData as jest.Mock).mockResolvedValue(mockResponse);
    (getIconType as jest.Mock).mockReturnValue('copy');
    (getEuiComponentDocsData as jest.Mock).mockReturnValue(mockEuiDocs);

    const result = await getInspectedElementData({
      httpService: mockHttpService,
      target: mockTarget,
      componentPath: mockComponentPath,
      sourceComponent: mockSourceComponent,
    });

    expect(findDebugSource).toHaveBeenCalledWith(mockTarget);
    expect(fetchComponentData).toHaveBeenCalledWith({
      httpService: mockHttpService,
      fileName: mockFileData.fileName,
    });
    expect(getIconType).toHaveBeenCalledWith(mockTarget);
    expect(getEuiComponentDocsData).toHaveBeenCalledWith(mockComponentPath);

    expect(result).toEqual({
      ...mockFileData,
      ...mockResponse,
      iconType: 'copy',
      euiData: mockEuiDocs,
      sourceComponent: mockSourceComponent,
    });
  });
});
