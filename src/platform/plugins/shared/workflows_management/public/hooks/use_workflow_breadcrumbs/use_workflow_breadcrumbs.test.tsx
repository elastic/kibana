/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useWorkflowsBreadcrumbs } from './use_workflow_breadcrumbs';
import { PLUGIN_ID } from '../../../common';
import { createStartServicesMock } from '../../mocks';
import type { WorkflowsServices } from '../../types';
import { useKibana } from '../use_kibana';

jest.mock('../use_kibana');
const mockUseKibana = useKibana as jest.Mock;

// Mock i18n to control translations
jest.mock('@kbn/i18n', () => ({
  i18n: { translate: jest.fn((key, { defaultMessage }) => defaultMessage) },
}));

describe('useWorkflowsBreadcrumbs', () => {
  let mockServices: ReturnType<typeof createStartServicesMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServices = createStartServicesMock();
    mockServices.application.getUrlForApp.mockReturnValue('/app/workflows');

    mockUseKibana.mockReturnValue({ services: mockServices });
  });

  describe('when running in non-serverless environment', () => {
    beforeEach(() => {
      (mockServices as WorkflowsServices).serverless = undefined;
    });

    it('should set breadcrumbs without workflow title', () => {
      renderHook(useWorkflowsBreadcrumbs);

      expect(mockServices.chrome.setBreadcrumbs).toHaveBeenCalledWith(
        [
          {
            text: 'Workflows',
            href: '/app/workflows',
            onClick: expect.any(Function),
          },
        ],
        { project: { value: [] } }
      );

      expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith(['Workflows']);
    });

    it('should set breadcrumbs with workflow title', () => {
      const workflowTitle = 'My Workflow';
      renderHook(useWorkflowsBreadcrumbs, { initialProps: workflowTitle });

      expect(mockServices.chrome.setBreadcrumbs).toHaveBeenCalledWith(
        [
          {
            text: 'Workflows',
            href: '/app/workflows',
            onClick: expect.any(Function),
          },
          {
            text: workflowTitle,
          },
        ],
        { project: { value: [{ text: workflowTitle }] } }
      );

      expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith([
        workflowTitle,
        'Workflows',
      ]);
    });

    it('should handle breadcrumb click event correctly', () => {
      renderHook(useWorkflowsBreadcrumbs);

      const [[breadcrumbs]] = mockServices.chrome.setBreadcrumbs.mock.calls;
      const mainBreadcrumb = breadcrumbs[0];

      // Test with preventDefault
      const mockEvent = { preventDefault: jest.fn() };
      mainBreadcrumb.onClick?.(mockEvent as any);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockServices.application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID);

      // Test without event object
      mockServices.application.navigateToApp.mockClear();
      mainBreadcrumb.onClick?.(null as any);

      expect(mockServices.application.navigateToApp).toHaveBeenCalledWith(PLUGIN_ID);
    });

    it('should get URL for app correctly', () => {
      renderHook(useWorkflowsBreadcrumbs);

      expect(mockServices.application.getUrlForApp).toHaveBeenCalledWith(PLUGIN_ID);
    });

    it('should update breadcrumbs when workflow title changes', () => {
      const { rerender } = renderHook(useWorkflowsBreadcrumbs, { initialProps: undefined });

      // Initial render without title
      expect(mockServices.chrome.setBreadcrumbs).toHaveBeenCalledWith(
        [
          {
            text: 'Workflows',
            href: '/app/workflows',
            onClick: expect.any(Function),
          },
        ],
        { project: { value: [] } }
      );
      expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith(['Workflows']);

      // Update with title
      const newWorkflowTitle = 'Updated Workflow';
      rerender(newWorkflowTitle);

      expect(mockServices.chrome.setBreadcrumbs).toHaveBeenCalledWith(
        [
          {
            text: 'Workflows',
            href: '/app/workflows',
            onClick: expect.any(Function),
          },
          {
            text: newWorkflowTitle,
          },
        ],
        { project: { value: [{ text: newWorkflowTitle }] } }
      );
      expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith([
        newWorkflowTitle,
        'Workflows',
      ]);
    });

    describe('edge cases', () => {
      it('should handle empty string workflow title as falsy', () => {
        renderHook(useWorkflowsBreadcrumbs, { initialProps: '' });

        // Empty string is falsy, so it behaves like no workflow title
        expect(mockServices.chrome.setBreadcrumbs).toHaveBeenCalledWith(
          [
            {
              text: 'Workflows',
              href: '/app/workflows',
              onClick: expect.any(Function),
            },
          ],
          { project: { value: [] } }
        );

        // However, docTitle.change still includes the empty string
        expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith(['Workflows']);
      });

      it('should handle null workflow title', () => {
        renderHook(useWorkflowsBreadcrumbs, { initialProps: null } as any);

        expect(mockServices.chrome.setBreadcrumbs).toHaveBeenCalledWith(
          [
            {
              text: 'Workflows',
              href: '/app/workflows',
              onClick: expect.any(Function),
            },
          ],
          { project: { value: [] } }
        );

        expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith(['Workflows']);
      });
    });
  });

  describe('when running in serverless environment', () => {
    it('should only set trailing breadcrumbs in serverless without workflow title', () => {
      renderHook(useWorkflowsBreadcrumbs);

      expect(mockServices.serverless.setBreadcrumbs).toHaveBeenCalledWith([]);
      expect(mockServices.chrome.setBreadcrumbs).not.toHaveBeenCalled();
      expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith(['Workflows']);
    });

    it('should only set trailing breadcrumbs in serverless with workflow title', () => {
      const workflowTitle = 'My Serverless Workflow';
      renderHook(useWorkflowsBreadcrumbs, { initialProps: workflowTitle });

      expect(mockServices.serverless.setBreadcrumbs).toHaveBeenCalledWith([
        { text: workflowTitle },
      ]);
      expect(mockServices.chrome.setBreadcrumbs).not.toHaveBeenCalled();
      expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith([
        workflowTitle,
        'Workflows',
      ]);
    });

    it('should update serverless breadcrumbs when workflow title changes', () => {
      const { rerender } = renderHook(useWorkflowsBreadcrumbs, { initialProps: undefined });

      // Initial render without title
      expect(mockServices.serverless.setBreadcrumbs).toHaveBeenCalledWith([]);
      expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith(['Workflows']);

      // Update with title
      const newWorkflowTitle = 'Updated Serverless Workflow';
      rerender(newWorkflowTitle);

      expect(mockServices.serverless.setBreadcrumbs).toHaveBeenCalledWith([
        { text: newWorkflowTitle },
      ]);
      expect(mockServices.chrome.docTitle.change).toHaveBeenCalledWith([
        newWorkflowTitle,
        'Workflows',
      ]);
    });
  });
});
