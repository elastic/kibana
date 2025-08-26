/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEuiComponentDocsData } from './get_eui_component_docs_data';
import { getEuiComponentNamesFromPath } from './get_eui_component_names_from_path';

jest.mock('./get_eui_component_names_from_path');
jest.mock('../constants', () => ({
  EUI_COMPONENTS_DOCS_MAP: new Map([['EuiButton', '/components/navigation/buttons/button']]),
  EUI_DOCS_BASE: 'https://eui.elastic.co/docs',
}));

const mockGetEuiComponentNamesFromPath = getEuiComponentNamesFromPath as jest.MockedFunction<
  typeof getEuiComponentNamesFromPath
>;

describe('getEuiComponentDocsData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when componentPath is null', () => {
    expect(getEuiComponentDocsData(null)).toBeNull();
  });

  it('should return null when componentPath is empty string', () => {
    expect(getEuiComponentDocsData('')).toBeNull();
  });

  it('should return data when a single component with docs is found', () => {
    mockGetEuiComponentNamesFromPath.mockReturnValueOnce(['EuiButton']);

    const result = getEuiComponentDocsData('some/path/with/EuiButton');

    expect(result).toEqual({
      componentName: 'EuiButton',
      docsLink: 'https://eui.elastic.co/docs/components/navigation/buttons/button',
    });
    expect(mockGetEuiComponentNamesFromPath).toHaveBeenCalledWith('some/path/with/EuiButton');
  });

  it('should return data for the first component with docs when multiple components are found', () => {
    mockGetEuiComponentNamesFromPath.mockReturnValueOnce(['EuiUnknown', 'EuiButton', 'EuiPanel']);

    const result = getEuiComponentDocsData('some/path/with/multiple/components');

    expect(result).toEqual({
      componentName: 'EuiButton',
      docsLink: 'https://eui.elastic.co/docs/components/navigation/buttons/button',
    });
    expect(mockGetEuiComponentNamesFromPath).toHaveBeenCalledWith(
      'some/path/with/multiple/components'
    );
  });

  it('should return null when no components with docs are found', () => {
    mockGetEuiComponentNamesFromPath.mockReturnValueOnce(['EuiUnknown']);

    const result = getEuiComponentDocsData('some/path/with/unknown/component');

    expect(result).toBeNull();
    expect(mockGetEuiComponentNamesFromPath).toHaveBeenCalledWith(
      'some/path/with/unknown/component'
    );
  });

  it('should try to use componentPath directly if no candidates are found and it starts with Eui', () => {
    mockGetEuiComponentNamesFromPath.mockReturnValueOnce([]);

    const result = getEuiComponentDocsData('EuiButton');

    expect(result).toEqual({
      componentName: 'EuiButton',
      docsLink: 'https://eui.elastic.co/docs/components/navigation/buttons/button',
    });
    expect(mockGetEuiComponentNamesFromPath).toHaveBeenCalledWith('EuiButton');
  });

  it('should return null when no components are found and componentPath does not start with Eui', () => {
    mockGetEuiComponentNamesFromPath.mockReturnValueOnce([]);

    const result = getEuiComponentDocsData('SomeOtherComponent');

    expect(result).toBeNull();
    expect(mockGetEuiComponentNamesFromPath).toHaveBeenCalledWith('SomeOtherComponent');
  });
});
