/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useState } from 'react';
import type { Subscription } from 'rxjs';
import { combineLatest } from 'rxjs';
import type {
  ActionButton,
  AttachmentUIDefinition,
  CanvasRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { CodeEditor } from '@kbn/code-editor';
import type { ApplicationStart, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider, useKibana } from '@kbn/kibana-react-plugin/public';
import { useWorkflowsApi, type WorkflowApi } from '@kbn/workflows-ui';
import { PLUGIN_ID } from '../../../../common';
import type { TelemetryServiceClient } from '../../../common/lib/telemetry/types';
import { WorkflowsBaseTelemetry } from '../../../common/service/telemetry';
import { queryClient } from '../../../shared/lib/query_client';
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

const extractErrorMessage = (error: unknown): string =>
  (error as { body?: { message?: string } })?.body?.message ||
  (error as Error)?.message ||
  'Unknown error';

interface SaveWorkflowParams {
  workflowApi: WorkflowApi;
  notifications: CoreStart['notifications'];
  yaml: string;
  workflowId?: string;
  updateOrigin: CanvasRenderCallbacks['updateOrigin'];
  telemetry: WorkflowsBaseTelemetry;
}

const saveWorkflow = async ({
  workflowApi,
  notifications,
  yaml,
  workflowId,
  updateOrigin,
  telemetry,
}: SaveWorkflowParams): Promise<string | undefined> => {
  try {
    let savedId = workflowId;
    if (workflowId) {
      const result = await workflowApi.updateWorkflow(workflowId, { yaml });
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
      telemetry.reportWorkflowUpdated({
        workflowId,
        workflowUpdate: { yaml },
        hasValidationErrors: result.validationErrors.length > 0,
        validationErrorCount: result.validationErrors.length,
        aiAssisted: true,
      });
    } else {
      const result = await workflowApi.createWorkflow({ yaml });
      savedId = result.id;
      await updateOrigin(result.id);
      telemetry.reportWorkflowCreated({
        workflowId: result.id,
        aiAssisted: true,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
    notifications.toasts.addSuccess(
      i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.saveSuccess', {
        defaultMessage: 'Workflow saved',
      }),
      { toastLifeTimeMs: 2000 }
    );
    return savedId;
  } catch (error) {
    notifications.toasts.addDanger({
      title: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.saveError', {
        defaultMessage: 'Failed to save workflow',
      }),
      text: extractErrorMessage(error),
    });
    return undefined;
  }
};

const READONLY_EDITOR_OPTIONS = {
  readOnly: true,
  minimap: { enabled: false },
  automaticLayout: true,
  lineNumbers: 'on' as const,
  scrollBeyondLastLine: false,
  tabSize: 2,
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
  isSidebar: boolean;
  registerActionButtons: CanvasRenderCallbacks['registerActionButtons'];
  updateOrigin: CanvasRenderCallbacks['updateOrigin'];
  application: ApplicationStart;
  isOnWorkflowPage: (workflowId: string) => boolean;
  telemetry: WorkflowsBaseTelemetry;
}> = ({
  attachment,
  isSidebar,
  registerActionButtons,
  updateOrigin,
  application,
  isOnWorkflowPage,
  telemetry,
}) => {
  useWorkflowsMonacoTheme();

  const workflowApi = useWorkflowsApi();
  const { notifications } = useKibana<{ notifications: CoreStart['notifications'] }>().services;

  // Defer button registration past the initial mount cycle so the parent
  // flyout's clearing effect (which also fires on mount) doesn't overwrite
  // our buttons. This mirrors the dashboard pattern where registration is
  // gated on an async dependency (dashboardApi).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  const [savedWorkflowId, setSavedWorkflowId] = useState<string | undefined>(
    attachment.data.workflowId
  );
  const workflowId = savedWorkflowId ?? attachment.data.workflowId;

  const handleSave = useCallback(async () => {
    const id = await saveWorkflow({
      workflowApi,
      notifications,
      yaml: attachment.data.yaml,
      workflowId,
      updateOrigin,
      telemetry,
    });
    if (id && !workflowId) {
      setSavedWorkflowId(id);
    }
  }, [workflowApi, notifications, attachment.data.yaml, workflowId, updateOrigin, telemetry]);

  const handleSaveAsNew = useCallback(async () => {
    try {
      const result = await workflowApi.createWorkflow({ yaml: attachment.data.yaml });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      telemetry.reportWorkflowCreated({
        workflowId: result.id,
        aiAssisted: true,
      });
      notifications.toasts.addSuccess(
        i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.saveAsNewSuccess', {
          defaultMessage: 'Workflow saved as new',
        }),
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
  }, [workflowApi, notifications, application, attachment.data.yaml, telemetry]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const buttons: ActionButton[] = [];

    if (workflowId) {
      buttons.push({
        label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.override', {
          defaultMessage: 'Override',
        }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        handler: handleSave,
      });
      buttons.push({
        label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.saveAsNew', {
          defaultMessage: 'Save as new',
        }),
        icon: 'copy',
        type: ActionButtonType.SECONDARY,
        handler: handleSaveAsNew,
      });
    } else {
      buttons.push({
        label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.save', {
          defaultMessage: 'Save',
        }),
        icon: 'save',
        type: ActionButtonType.PRIMARY,
        handler: handleSave,
      });
    }

    if (workflowId && !isOnWorkflowPage(workflowId)) {
      buttons.push({
        label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.openInEditor', {
          defaultMessage: 'Open in editor',
        }),
        icon: 'popout',
        type: ActionButtonType.SECONDARY,
        handler: () => {
          application.navigateToApp(PLUGIN_ID, { path: workflowId });
        },
      });
    }

    registerActionButtons(buttons);
  }, [
    ready,
    isSidebar,
    workflowId,
    handleSave,
    handleSaveAsNew,
    isOnWorkflowPage,
    application,
    registerActionButtons,
  ]);

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
  core,
  telemetry: telemetryClient,
}: {
  core: CoreStart;
  telemetry: TelemetryServiceClient;
}): AttachmentUIDefinition<WorkflowYamlAttachment> => {
  const { application } = core;
  const telemetry = new WorkflowsBaseTelemetry(telemetryClient);
  let currentAppId: string | undefined;
  let currentLocation = '';
  let appContextSub: Subscription | undefined;
  const trackAppContext = () => {
    appContextSub?.unsubscribe();
    appContextSub = combineLatest([
      application.currentAppId$,
      application.currentLocation$,
    ]).subscribe(([appId, location]) => {
      currentAppId = appId;
      currentLocation = location;
    });
  };
  trackAppContext();

  const isOnWorkflowPage = (workflowId: string): boolean =>
    currentAppId === PLUGIN_ID && currentLocation.includes(workflowId);

  return {
    getLabel: (attachment) =>
      attachment.data.name ||
      i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.label', {
        defaultMessage: 'Workflow',
      }),

    getIcon: () => 'workflowsApp',

    getActionButtons: ({ attachment, openCanvas }) => {
      const buttons: ActionButton[] = [];

      if (openCanvas) {
        buttons.push({
          label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.preview', {
            defaultMessage: 'Preview',
          }),
          icon: 'eye',
          type: ActionButtonType.SECONDARY,
          handler: openCanvas,
        });
      }

      if (attachment.data.workflowId && !isOnWorkflowPage(attachment.data.workflowId)) {
        buttons.push({
          label: i18n.translate(
            'workflowsManagement.attachmentRenderers.workflowYaml.openInEditor',
            { defaultMessage: 'Open in editor' }
          ),
          icon: 'popout',
          type: ActionButtonType.SECONDARY,
          handler: () => {
            application.navigateToApp(PLUGIN_ID, { path: attachment.data.workflowId });
          },
        });
      }

      return buttons;
    },

    renderCanvasContent: ({ attachment, isSidebar }, { registerActionButtons, updateOrigin }) => (
      <KibanaContextProvider services={core}>
        <WorkflowYamlCanvasContent
          attachment={attachment}
          isSidebar={isSidebar}
          registerActionButtons={registerActionButtons}
          updateOrigin={updateOrigin}
          application={application}
          isOnWorkflowPage={isOnWorkflowPage}
          telemetry={telemetry}
        />
      </KibanaContextProvider>
    ),
  };
};
