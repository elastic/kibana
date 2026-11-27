/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElementFiber } from '../../react_fiber';
import { getInspectedElementData } from './get_inspected_element_data';
import { getIconType } from './dom/get_icon_type';

jest.mock('./dom/get_icon_type');

describe('getInspectedElementData', () => {
  const resolveFileData = jest.fn();

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
      resolveFileData,
      sourceComponent: mockSourceComponent,
      target: null,
    });

    expect(result).toBeNull();
    expect(resolveFileData).not.toHaveBeenCalled();
  });

  it('should return null if sourceComponent is null', async () => {
    const result = await getInspectedElementData({
      resolveFileData,
      sourceComponent: null,
      target: mockTarget,
    });

    expect(result).toBeNull();
  });

  it('should return null if the host cannot resolve the file', async () => {
    resolveFileData.mockResolvedValue(null);

    const result = await getInspectedElementData({
      resolveFileData,
      sourceComponent: mockSourceComponent,
      target: mockTarget,
    });

    expect(resolveFileData).toHaveBeenCalledWith(mockTarget.source.fileName);
    expect(result).toBeNull();
  });

  it('should return null if the host resolver rejects', async () => {
    resolveFileData.mockRejectedValue(new Error('Network error'));

    const result = await getInspectedElementData({
      resolveFileData,
      sourceComponent: mockSourceComponent,
      target: mockTarget,
    });

    expect(result).toBeNull();
  });

  it('should return component data', async () => {
    resolveFileData.mockResolvedValue(mockResponse);
    (getIconType as jest.Mock).mockReturnValue('copy');

    const result = await getInspectedElementData({
      resolveFileData,
      sourceComponent: mockSourceComponent,
      target: mockTarget,
    });

    expect(resolveFileData).toHaveBeenCalledWith(mockTarget.source.fileName);
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

  it('should default codeowners to an empty list', async () => {
    resolveFileData.mockResolvedValue({
      baseFileName: 'capybara.tsx',
      relativePath: 'src/path/to/capybara.tsx',
    });

    const result = await getInspectedElementData({
      resolveFileData,
      sourceComponent: mockSourceComponent,
      target: mockTarget,
    });

    expect(result?.fileData.codeowners).toEqual([]);
  });
});
