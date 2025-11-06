/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { GDriveGraphNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { BaseStep, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';
import { GoogleDriveClient, type ListFilesOptions } from './google_drive_client';

export interface GDriveStep extends BaseStep {
  with: {
    service_credential?: Record<string, any>;
    operation?: 'list' | 'get' | 'ping' | 'download';
    fileId?: string;
    fileName?: string;
    fileContent?: string;
    folderId?: string;
    mimeType?: string;
    subject?: string;
  };
}

export class GDriveStepImpl extends BaseAtomicNodeImplementation<GDriveStep> {
  private driveClient: GoogleDriveClient | null = null;

  constructor(
    node: GDriveGraphNode,
    stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger,
    workflowRuntime: WorkflowExecutionRuntimeManager
  ) {
    const gdriveStep: GDriveStep = {
      name: node.configuration.name,
      type: node.type,
      spaceId: '', // TODO: get from context or node
      with: node.configuration.with,
    };
    super(
      gdriveStep,
      stepExecutionRuntime,
      undefined, // no connector executor needed for GDrive
      workflowRuntime
    );
  }

  public getInput() {
    const { service_credential, operation, fileId, folderId, subject } = this.step.with;

    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext({
      service_credential,
      operation: operation || 'list',
      fileId,
      folderId,
      subject,
    });
  }

  protected async _run(input: any): Promise<RunStepResult> {
    try {
      return await this.executeGDriveOperation(input);
    } catch (error) {
      return this.handleFailure(input, error);
    }
  }

  private async executeGDriveOperation(input: any): Promise<RunStepResult> {
    const { service_credential, operation = 'list', fileId, folderId, subject } = input;

    if (!service_credential) {
      throw new Error('service_credential is required for Google Drive operations');
    }

    // Initialize client if not already done
    if (!this.driveClient) {
      this.driveClient = new GoogleDriveClient({
        service_credential,
        subject,
      });
    }

    this.workflowLogger.logInfo(`Executing Google Drive operation: ${operation}`, {
      workflow: { step_id: this.step.name },
      event: { action: 'gdrive_operation', outcome: 'unknown' },
      tags: ['gdrive', operation],
    });

    let output: any;

    switch (operation) {
      case 'ping':
        output = await this.handlePing();
        break;

      case 'list':
        output = await this.handleList(folderId);
        break;

      case 'get':
        if (!fileId) {
          throw new Error('fileId is required for get operation');
        }
        output = await this.handleGet(fileId);
        break;

      case 'download':
        if (!fileId) {
          throw new Error('fileId is required for download operation');
        }
        output = await this.handleDownload(fileId);
        break;

      default:
        throw new Error(`Unsupported Google Drive operation: ${operation}`);
    }

    this.workflowLogger.logInfo(`Google Drive operation completed successfully: ${operation}`, {
      workflow: { step_id: this.step.name },
      event: { action: 'gdrive_operation', outcome: 'success' },
      tags: ['gdrive', operation],
    });

    return {
      input,
      output,
      error: undefined,
    };
  }

  private async handlePing(): Promise<{ kind: string; connected: boolean }> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    const result = await this.driveClient.ping();
    return {
      ...result,
      connected: true,
    };
  }

  private async handleList(folderId?: string): Promise<any> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    const allFiles: any[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    let incompleteSearch = false;

    do {
      const options: ListFilesOptions = {
        folderId,
        pageSize: 100,
        pageToken,
      };

      this.workflowLogger.logInfo(
        `Fetching Google Drive files page ${pageCount + 1}${pageToken ? ` (continuing from previous page)` : ''}`,
        {
          workflow: { step_id: this.step.name },
          event: { action: 'gdrive_list_pagination', outcome: 'unknown' },
          tags: ['gdrive', 'list', 'pagination'],
        }
      );

      const result = await this.driveClient.listFiles(options);

      if (result.files && result.files.length > 0) {
        allFiles.push(...result.files);
      }

      pageToken = result.nextPageToken;
      incompleteSearch = result.incompleteSearch || false;
      pageCount++;

      // Log progress
      if (pageToken) {
        this.workflowLogger.logInfo(
          `Fetched ${allFiles.length} files so far, more pages available`,
          {
            workflow: { step_id: this.step.name },
            event: { action: 'gdrive_list_pagination', outcome: 'success' },
            tags: ['gdrive', 'list', 'pagination'],
          }
        );
      }
    } while (pageToken);

    this.workflowLogger.logInfo(
      `Completed fetching all Google Drive files: ${allFiles.length} files across ${pageCount} page(s)`,
      {
        workflow: { step_id: this.step.name },
        event: { action: 'gdrive_list_complete', outcome: 'success' },
        tags: ['gdrive', 'list'],
      }
    );

    return {
      files: allFiles,
      count: allFiles.length,
      pages: pageCount,
      incompleteSearch,
    };
  }

  private async handleGet(fileId: string): Promise<any> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    const file = await this.driveClient.getFile(fileId);
    return file;
  }

  private async handleDownload(fileId: string): Promise<any> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    this.workflowLogger.logInfo(`Downloading file content for fileId: ${fileId}`, {
      workflow: { step_id: this.step.name },
      event: { action: 'gdrive_download', outcome: 'unknown' },
      tags: ['gdrive', 'download'],
    });

    // First get file metadata to know the file name and type
    const fileMetadata = await this.driveClient.getFile(fileId);

    // Download the file content
    const fileContent = await this.driveClient.downloadFile(fileId);

    this.workflowLogger.logInfo(
      `Successfully downloaded file: ${fileMetadata.name} (${fileContent.size} bytes)`,
      {
        workflow: { step_id: this.step.name },
        event: { action: 'gdrive_download', outcome: 'success' },
        tags: ['gdrive', 'download'],
      }
    );

    return {
      fileId: fileMetadata.id,
      fileName: fileMetadata.name,
      mimeType: fileMetadata.mimeType,
      size: fileContent.size,
      content: fileContent.content,
      contentEncoding: fileContent.encoding,
      metadata: {
        createdTime: fileMetadata.createdTime,
        modifiedTime: fileMetadata.modifiedTime,
        parents: fileMetadata.parents,
        webViewLink: fileMetadata.webViewLink,
      },
    };
  }

  protected async handleFailure(input: any, error: any): Promise<RunStepResult> {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }

    this.workflowLogger.logError(
      `Google Drive operation failed: ${errorMessage}`,
      error instanceof Error ? error : new Error(errorMessage),
      {
        workflow: { step_id: this.step.name },
        event: { action: 'gdrive_operation', outcome: 'failure' },
        tags: ['gdrive', 'error'],
      }
    );

    return {
      input,
      output: undefined,
      error: errorMessage,
    };
  }
}

