/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { renderHook } from '@testing-library/react-hooks';
import { EventEmitter } from 'events';

import { coreMock } from '../../../../../../core/public/mocks';
import { useSavedVisInstance } from './use_saved_vis_instance';
import { redirectWhenMissing } from '../../../../../kibana_utils/public';
import { getEditBreadcrumbs, getCreateBreadcrumbs } from '../breadcrumbs';
import { VisualizeServices } from '../../types';
import { VisualizeConstants } from '../../visualize_constants';

const mockDefaultEditorControllerDestroy = jest.fn();
const mockEmbeddableHandlerDestroy = jest.fn();
const mockEmbeddableHandlerRender = jest.fn();
const mockSavedVisDestroy = jest.fn();
const savedVisId = '9ca7aa90-b892-11e8-a6d9-e546fe2bba5f';
const mockSavedVisInstance = {
  embeddableHandler: {
    destroy: mockEmbeddableHandlerDestroy,
    render: mockEmbeddableHandlerRender,
  },
  savedVis: {
    id: savedVisId,
    title: 'Test Vis',
    destroy: mockSavedVisDestroy,
  },
  vis: {
    type: {},
  },
};

jest.mock('../get_visualization_instance', () => ({
  getVisualizationInstance: jest.fn(() => mockSavedVisInstance),
}));
jest.mock('../breadcrumbs', () => ({
  getEditBreadcrumbs: jest.fn((text) => text),
  getCreateBreadcrumbs: jest.fn((text) => text),
}));
jest.mock('../../../../../vis_default_editor/public', () => ({
  DefaultEditorController: jest.fn(() => ({ destroy: mockDefaultEditorControllerDestroy })),
}));
jest.mock('../../../../../kibana_utils/public');

const mockGetVisualizationInstance = jest.requireMock('../get_visualization_instance')
  .getVisualizationInstance;

describe('useSavedVisInstance', () => {
  const coreStartMock = coreMock.createStart();
  const toastNotifications = coreStartMock.notifications.toasts;
  let mockServices: VisualizeServices;
  const eventEmitter = new EventEmitter();

  beforeEach(() => {
    mockServices = ({
      ...coreStartMock,
      toastNotifications,
      history: {
        location: {
          pathname: VisualizeConstants.EDIT_PATH,
        },
        replace: () => {},
      },
      visualizations: {
        all: jest.fn(() => [
          {
            name: 'area',
            requiresSearch: true,
            options: {
              showIndexSelection: true,
            },
          },
          { name: 'gauge' },
        ]),
      },
    } as unknown) as VisualizeServices;

    mockDefaultEditorControllerDestroy.mockClear();
    mockEmbeddableHandlerDestroy.mockClear();
    mockEmbeddableHandlerRender.mockClear();
    mockSavedVisDestroy.mockClear();
    toastNotifications.addWarning.mockClear();
    mockGetVisualizationInstance.mockClear();
  });

  test('should not load instance until chrome is defined', () => {
    const { result } = renderHook(() =>
      useSavedVisInstance(mockServices, eventEmitter, undefined, undefined)
    );
    expect(mockGetVisualizationInstance).not.toHaveBeenCalled();
    expect(result.current.visEditorController).toBeUndefined();
    expect(result.current.savedVisInstance).toBeUndefined();
    expect(result.current.visEditorRef).toBeDefined();
  });

  describe('edit saved visualization route', () => {
    test('should load instance and initiate an editor if chrome is set up', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useSavedVisInstance(mockServices, eventEmitter, true, savedVisId)
      );

      expect(mockGetVisualizationInstance).toHaveBeenCalledWith(mockServices, savedVisId);
      expect(mockGetVisualizationInstance.mock.calls.length).toBe(1);

      await waitForNextUpdate();
      expect(mockServices.chrome.setBreadcrumbs).toHaveBeenCalledWith('Test Vis');
      expect(getEditBreadcrumbs).toHaveBeenCalledWith('Test Vis');
      expect(getCreateBreadcrumbs).not.toHaveBeenCalled();
      expect(mockEmbeddableHandlerRender).not.toHaveBeenCalled();
      expect(result.current.visEditorController).toBeDefined();
      expect(result.current.savedVisInstance).toBeDefined();
    });

    test('should destroy the editor and the savedVis on unmount if chrome exists', async () => {
      const { unmount, waitForNextUpdate } = renderHook(() =>
        useSavedVisInstance(mockServices, eventEmitter, true, savedVisId)
      );

      await waitForNextUpdate();
      unmount();

      expect(mockDefaultEditorControllerDestroy.mock.calls.length).toBe(1);
      expect(mockEmbeddableHandlerDestroy).not.toHaveBeenCalled();
      expect(mockSavedVisDestroy.mock.calls.length).toBe(1);
    });
  });

  describe('create new visualization route', () => {
    beforeEach(() => {
      mockServices.history.location = {
        ...mockServices.history.location,
        pathname: VisualizeConstants.CREATE_PATH,
        search: '?type=area&indexPattern=1a2b3c4d',
      };
      delete mockSavedVisInstance.savedVis.id;
    });

    test('should create new visualization based on search params', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        useSavedVisInstance(mockServices, eventEmitter, true, undefined)
      );

      expect(mockGetVisualizationInstance).toHaveBeenCalledWith(mockServices, {
        indexPattern: '1a2b3c4d',
        type: 'area',
      });

      await waitForNextUpdate();

      expect(getCreateBreadcrumbs).toHaveBeenCalled();
      expect(mockEmbeddableHandlerRender).not.toHaveBeenCalled();
      expect(result.current.visEditorController).toBeDefined();
      expect(result.current.savedVisInstance).toBeDefined();
    });

    test('should throw error if vis type is invalid', async () => {
      mockServices.history.location = {
        ...mockServices.history.location,
        search: '?type=myVisType&indexPattern=1a2b3c4d',
      };

      renderHook(() => useSavedVisInstance(mockServices, eventEmitter, true, undefined));

      expect(mockGetVisualizationInstance).not.toHaveBeenCalled();
      expect(redirectWhenMissing).toHaveBeenCalled();
      expect(toastNotifications.addWarning).toHaveBeenCalled();
    });

    test("should throw error if index pattern or saved search id doesn't exist in search params", async () => {
      mockServices.history.location = {
        ...mockServices.history.location,
        search: '?type=area',
      };

      renderHook(() => useSavedVisInstance(mockServices, eventEmitter, true, undefined));

      expect(mockGetVisualizationInstance).not.toHaveBeenCalled();
      expect(redirectWhenMissing).toHaveBeenCalled();
      expect(toastNotifications.addWarning).toHaveBeenCalled();
    });
  });

  describe('embeded mode', () => {
    test('should create new visualization based on search params', async () => {
      const { result, unmount, waitForNextUpdate } = renderHook(() =>
        useSavedVisInstance(mockServices, eventEmitter, false, savedVisId)
      );

      // mock editor ref
      // @ts-expect-error
      result.current.visEditorRef.current = 'div';

      expect(mockGetVisualizationInstance).toHaveBeenCalledWith(mockServices, savedVisId);

      await waitForNextUpdate();

      expect(mockEmbeddableHandlerRender).toHaveBeenCalled();
      expect(result.current.visEditorController).toBeUndefined();
      expect(result.current.savedVisInstance).toBeDefined();

      unmount();
      expect(mockDefaultEditorControllerDestroy).not.toHaveBeenCalled();
      expect(mockEmbeddableHandlerDestroy.mock.calls.length).toBe(1);
      expect(mockSavedVisDestroy.mock.calls.length).toBe(1);
    });
  });
});
