/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { createWorkflowYamlAttachmentUiDefinition } from './workflow_yaml_attachment_renderer';

jest.mock('../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme', () => ({
  useWorkflowsMonacoTheme: jest.fn(),
  WORKFLOWS_MONACO_EDITOR_THEME: 'test-theme',
}));

const createMockServices = ({
  currentAppId = 'other',
  currentLocation = '/',
}: { currentAppId?: string; currentLocation?: string } = {}) => ({
  http: {
    post: jest.fn(),
    put: jest.fn(),
  } as any,
  notifications: {
    toasts: {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
    },
  } as any,
  application: {
    navigateToApp: jest.fn(),
    currentAppId$: new BehaviorSubject<string | undefined>(currentAppId),
    currentLocation$: new BehaviorSubject<string>(currentLocation),
  } as any,
});

const createAttachment = (overrides: Partial<{ workflowId?: string; name?: string }> = {}) => ({
  id: 'att-1',
  type: 'workflow.yaml',
  versions: [],
  current_version: 1,
  data: {
    yaml: 'version: "1"\nname: Test Workflow\nsteps: []\n',
    workflowId: overrides.workflowId,
    name: overrides.name,
  },
});

describe('createWorkflowYamlAttachmentUiDefinition', () => {
  it('returns an object with the expected shape', () => {
    const services = createMockServices();
    const definition = createWorkflowYamlAttachmentUiDefinition(services);

    expect(definition.getLabel).toBeDefined();
    expect(definition.getIcon).toBeDefined();
    expect(definition.getActionButtons).toBeDefined();
    expect(definition.renderCanvasContent).toBeDefined();
  });

  describe('getLabel', () => {
    it('returns the workflow name when present', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ name: 'My Workflow' });

      expect(definition.getLabel(attachment)).toBe('My Workflow');
    });

    it('returns the default label when name is absent', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      expect(definition.getLabel(attachment)).toBe('Workflow');
    });
  });

  describe('getIcon', () => {
    it('returns the workflows app icon', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);

      expect(definition.getIcon!()).toBe('workflowsApp');
    });
  });

  describe('getActionButtons', () => {
    it('includes Preview button when openCanvas is provided', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        openCanvas: jest.fn(),
      });

      const previewButton = buttons.find((b) => b.label === 'Preview');
      expect(previewButton).toBeDefined();
    });

    it('does NOT include Save button (Save is only in canvas)', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
        openCanvas: jest.fn(),
      });

      const saveButton = buttons.find(
        (b) => b.label === 'Save' || b.label === 'Update workflow' || b.label === 'Save as new'
      );
      expect(saveButton).toBeUndefined();
    });

    it('returns Override and Save as new buttons in canvas mode for existing workflow', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ workflowId: 'wf-123' });

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: true,
        updateOrigin: jest.fn(),
      });

      expect(buttons.find((b) => b.label === 'Override')).toBeDefined();
      expect(buttons.find((b) => b.label === 'Save as new')).toBeDefined();
    });

    it('returns only Save button in canvas mode for new workflow', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: true,
        updateOrigin: jest.fn(),
      });

      expect(buttons.find((b) => b.label === 'Save')).toBeDefined();
      expect(buttons.find((b) => b.label === 'Override')).toBeUndefined();
      expect(buttons.find((b) => b.label === 'Save as new')).toBeUndefined();
    });

    it('does NOT return any action buttons in canvas mode when in sidebar', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ workflowId: 'wf-123' });

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: true,
        isCanvas: true,
        updateOrigin: jest.fn(),
      });

      expect(buttons.find((b) => b.label === 'Override')).toBeUndefined();
      expect(buttons.find((b) => b.label === 'Save as new')).toBeUndefined();
      expect(buttons.find((b) => b.label === 'Save')).toBeUndefined();
    });

    it('includes Open in editor button when workflowId is present', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ workflowId: 'wf-123' });

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      });

      const openInEditorButton = buttons.find((b) => b.label === 'Open in editor');
      expect(openInEditorButton).toBeDefined();
    });

    it('does NOT include Open in editor button when workflowId is absent', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      });

      const openInEditorButton = buttons.find((b) => b.label === 'Open in editor');
      expect(openInEditorButton).toBeUndefined();
    });

    it('does NOT include Open in editor button when already on that workflow page', () => {
      const services = createMockServices({
        currentAppId: 'workflows',
        currentLocation: '/wf-123',
      });
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment({ workflowId: 'wf-123' });

      const buttons = definition.getActionButtons!({
        attachment,
        isSidebar: false,
        isCanvas: false,
        updateOrigin: jest.fn(),
      });

      const openInEditorButton = buttons.find((b) => b.label === 'Open in editor');
      expect(openInEditorButton).toBeUndefined();
    });

    describe('Open in editor button handler', () => {
      it('calls application.navigateToApp with the workflow ID', () => {
        const services = createMockServices();
        const definition = createWorkflowYamlAttachmentUiDefinition(services);
        const attachment = createAttachment({ workflowId: 'wf-123' });

        const buttons = definition.getActionButtons!({
          attachment,
          isSidebar: false,
          isCanvas: false,
          updateOrigin: jest.fn(),
        });

        const openInEditorButton = buttons.find((b) => b.label === 'Open in editor')!;
        openInEditorButton.handler();

        expect(services.application.navigateToApp).toHaveBeenCalledWith('workflows', {
          path: 'wf-123',
        });
      });
    });
  });

  describe('renderCanvasContent', () => {
    it('renders a YAML code editor', () => {
      const services = createMockServices();
      const definition = createWorkflowYamlAttachmentUiDefinition(services);
      const attachment = createAttachment();

      const { container } = render(
        <>
          {definition.renderCanvasContent(
            { attachment, isSidebar: false },
            { registerActionButtons: jest.fn(), updateOrigin: jest.fn() }
          )}
        </>
      );

      expect(container.querySelector('[data-test-subj="TextBasedLangEditor"]')).toBeDefined();
    });
  });
});
