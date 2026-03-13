/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React from 'react';
import type { ReactNode } from 'react';
import { combineLatest } from 'rxjs';
import { CodeEditor } from '@kbn/code-editor';
import type { ApplicationStart, HttpSetup, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../../common';
import { queryClient } from '../../../shared/lib/query_client';
import { createWorkflow, updateWorkflow } from '../../../shared/lib/workflows_api';
import {
  useWorkflowsMonacoTheme,
  WORKFLOWS_MONACO_EDITOR_THEME,
} from '../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';

interface WorkflowYamlData {
  yaml: string;
  workflowId?: string;
  name?: string;
}

interface WorkflowYamlAttachment {
  id: string;
  type: string;
  data: WorkflowYamlData;
}

// Local button type constants matching ActionButtonType enum values
const ACTION_TYPE_PRIMARY = 'primary';
const ACTION_TYPE_SECONDARY = 'secondary';

interface ActionButton {
  label: string;
  icon?: string;
  type: string;
  handler: () => void | Promise<void>;
}

const extractErrorMessage = (error: unknown): string =>
  (error as { body?: { message?: string } })?.body?.message ||
  (error as Error)?.message ||
  'Unknown error';

interface SaveWorkflowParams {
  http: HttpSetup;
  notifications: NotificationsStart;
  yaml: string;
  workflowId?: string;
  updateOrigin: (origin: unknown) => Promise<unknown>;
}

const saveWorkflow = async ({
  http,
  notifications,
  yaml,
  workflowId,
  updateOrigin,
}: SaveWorkflowParams): Promise<void> => {
  try {
    if (workflowId) {
      await updateWorkflow(http, workflowId, yaml);
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
    } else {
      const result = await createWorkflow(http, yaml);
      await updateOrigin({ workflowId: result.id });
    }
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
    notifications.toasts.addSuccess(
      i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.saveSuccess', {
        defaultMessage: 'Workflow saved',
      }),
      { toastLifeTimeMs: 2000 }
    );
  } catch (error) {
    notifications.toasts.addDanger({
      title: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.saveError', {
        defaultMessage: 'Failed to save workflow',
      }),
      text: extractErrorMessage(error),
    });
  }
};

const READONLY_EDITOR_OPTIONS = {
  readOnly: true,
  minimap: { enabled: false },
  automaticLayout: true,
  lineNumbers: 'on' as const,
  scrollBeyondLastLine: false,
  tabSize: 2,
  lineNumbersMinChars: 2,
  fontSize: 14,
  lineHeight: 23,
  renderWhitespace: 'none' as const,
  wordWrap: 'on' as const,
  wordWrapColumn: 80,
  wrappingIndent: 'indent' as const,
  theme: WORKFLOWS_MONACO_EDITOR_THEME,
  padding: { top: 24, bottom: 16 },
  domReadOnly: true,
  contextmenu: false,
};

const WorkflowYamlCanvasContent: React.FC<{
  attachment: WorkflowYamlAttachment;
}> = ({ attachment }) => {
  useWorkflowsMonacoTheme();

  return (
    <div
      css={css`
        height: 100%;
        min-height: 400px;
        width: 100%;
      `}
    >
      <CodeEditor
        languageId="yaml"
        value={attachment.data.yaml}
        options={READONLY_EDITOR_OPTIONS}
      />
    </div>
  );
};

export const createWorkflowYamlAttachmentUiDefinition = ({
  http,
  notifications,
  application,
}: {
  http: HttpSetup;
  notifications: NotificationsStart;
  application: ApplicationStart;
}): {
  getLabel: (attachment: WorkflowYamlAttachment) => string;
  getIcon: () => string;
  getActionButtons: (params: {
    attachment: WorkflowYamlAttachment;
    isSidebar: boolean;
    isCanvas: boolean;
    updateOrigin: (origin: unknown) => Promise<unknown>;
    openCanvas?: () => void;
  }) => ActionButton[];
  renderCanvasContent: (
    props: { attachment: WorkflowYamlAttachment; isSidebar: boolean },
    callbacks: {
      registerActionButtons: (buttons: ActionButton[]) => void;
      updateOrigin: (origin: unknown) => Promise<unknown>;
    }
  ) => ReactNode;
} => {
  // Track current app context via observables for page detection.
  // The subscription lives for the lifetime of the Kibana app instance.
  let currentAppId: string | undefined;
  let currentLocation = '';
  combineLatest([application.currentAppId$, application.currentLocation$]).subscribe(
    ([appId, location]) => {
      currentAppId = appId;
      currentLocation = location;
    }
  );

  const isOnWorkflowPage = (workflowId: string): boolean =>
    currentAppId === PLUGIN_ID && currentLocation.includes(workflowId);

  return {
    getLabel: (attachment) =>
      attachment.data.name ||
      i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.label', {
        defaultMessage: 'Workflow',
      }),

    getIcon: () => 'workflowsApp',

    getActionButtons: ({ attachment, openCanvas, isCanvas, isSidebar, updateOrigin }) => {
      const buttons: ActionButton[] = [];

      if (isCanvas) {
        if (!isSidebar) {
          if (attachment.data.workflowId) {
            buttons.push({
              label: i18n.translate(
                'workflowsManagement.attachmentRenderers.workflowYaml.override',
                { defaultMessage: 'Override' }
              ),
              icon: 'save',
              type: ACTION_TYPE_PRIMARY,
              handler: () =>
                saveWorkflow({
                  http,
                  notifications,
                  yaml: attachment.data.yaml,
                  workflowId: attachment.data.workflowId,
                  updateOrigin,
                }),
            });

            buttons.push({
              label: i18n.translate(
                'workflowsManagement.attachmentRenderers.workflowYaml.saveAsNew',
                { defaultMessage: 'Save as new' }
              ),
              icon: 'copy',
              type: ACTION_TYPE_SECONDARY,
              handler: async () => {
                try {
                  const result = await createWorkflow(http, attachment.data.yaml);
                  queryClient.invalidateQueries({ queryKey: ['workflows'] });
                  notifications.toasts.addSuccess(
                    i18n.translate(
                      'workflowsManagement.attachmentRenderers.workflowYaml.saveAsNewSuccess',
                      { defaultMessage: 'Workflow saved as new' }
                    ),
                    { toastLifeTimeMs: 2000 }
                  );
                  application.navigateToApp(PLUGIN_ID, { path: result.id });
                } catch (error) {
                  notifications.toasts.addDanger({
                    title: i18n.translate(
                      'workflowsManagement.attachmentRenderers.workflowYaml.saveAsNewError',
                      { defaultMessage: 'Failed to save workflow' }
                    ),
                    text: extractErrorMessage(error),
                  });
                }
              },
            });
          } else {
            buttons.push({
              label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.save', {
                defaultMessage: 'Save',
              }),
              icon: 'save',
              type: ACTION_TYPE_PRIMARY,
              handler: () =>
                saveWorkflow({
                  http,
                  notifications,
                  yaml: attachment.data.yaml,
                  updateOrigin,
                }),
            });
          }
        }
      } else {
        if (openCanvas) {
          buttons.push({
            label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.preview', {
              defaultMessage: 'Preview',
            }),
            icon: 'eye',
            type: ACTION_TYPE_SECONDARY,
            handler: openCanvas,
          });
        }
      }

      if (attachment.data.workflowId && !isOnWorkflowPage(attachment.data.workflowId)) {
        buttons.push({
          label: i18n.translate(
            'workflowsManagement.attachmentRenderers.workflowYaml.openInEditor',
            { defaultMessage: 'Open in editor' }
          ),
          icon: 'popout',
          type: ACTION_TYPE_SECONDARY,
          handler: () => {
            application.navigateToApp(PLUGIN_ID, { path: attachment.data.workflowId });
          },
        });
      }

      return buttons;
    },

    renderCanvasContent: ({ attachment }) => <WorkflowYamlCanvasContent attachment={attachment} />,
  };
};
