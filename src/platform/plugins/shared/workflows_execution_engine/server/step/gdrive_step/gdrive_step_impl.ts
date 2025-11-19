/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';
import type { GDriveGraphNode } from '@kbn/workflows/graph';
import type { FileMetadata, ListFilesOptions } from './google_drive_client';
import { GoogleDriveClient } from './google_drive_client';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { BaseStep, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';

export interface GDriveStep extends BaseStep {
  with: {
    service_credential?: Record<string, unknown>;
    accessToken?: string; // OAuth access token (preferred, from SavedObject)
    operation?: 'list' | 'get' | 'ping' | 'download' | 'search';
    fileId?: string;
    fileName?: string;
    fileContent?: string;
    folderId?: string;
    mimeType?: string;
    subject?: string;
    query?: string; // For search operation
    doc_limit?: number;
  };
}

interface GDriveOperationInput {
  service_credential?: Record<string, unknown>;
  accessToken?: string; // OAuth access token (preferred, from SavedObject)
  operation?: 'list' | 'get' | 'ping' | 'download' | 'search';
  fileId?: string;
  fileName?: string;
  fileContent?: string;
  folderId?: string;
  mimeType?: string;
  subject?: string;
  query?: string; // For search operation
  doc_limit?: number;
}

interface ListFilesOutput {
  files: FileMetadata[];
  count: number;
  pages: number;
  incompleteSearch: boolean;
}

interface DownloadFileOutput {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  content: string;
  contentEncoding: 'base64' | 'utf8';
  metadata: {
    createdTime?: string;
    modifiedTime?: string;
    parents?: string[];
    webViewLink?: string;
  };
}

type GDriveOperationOutput =
  | { kind: string; connected: boolean } // ping
  | ListFilesOutput // list
  | FileMetadata // get
  | DownloadFileOutput; // download

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
    const {
      service_credential,
      accessToken,
      operation,
      fileId,
      folderId,
      subject,
      query,
      doc_limit,
    } = this.step.with;

    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext({
      service_credential,
      accessToken,
      operation: operation || 'list',
      fileId,
      folderId,
      subject,
      query,
      doc_limit,
    });
  }

  protected async _run(input: GDriveOperationInput): Promise<RunStepResult> {
    try {
      return await this.executeGDriveOperation(input);
    } catch (error) {
      return this.handleFailure(input, error);
    }
  }

  private async executeGDriveOperation(input: GDriveOperationInput): Promise<RunStepResult> {
    // Resolve secrets in input (e.g., ${workplace_connector:id:secret_key})
    const resolvedInput =
      await this.stepExecutionRuntime.contextManager.resolveSecretsInValue<GDriveOperationInput>(
        input
      );
    const { operation = 'list', fileId, folderId, subject, query, doc_limit, service_credential, accessToken } = resolvedInput;

    if (!service_credential && !accessToken) {
      throw new Error(
        `Either service_credential or accessToken is required for Google Drive operations`
      );
    }

    // Initialize client if not already done
    if (!this.driveClient) {
      this.driveClient = new GoogleDriveClient({
        service_credential,
        accessToken,
        subject,
      });
    }

    this.workflowLogger.logInfo(`Executing Google Drive operation: ${operation}`, {
      workflow: { step_id: this.step.name },
      event: { action: 'gdrive_operation', outcome: 'unknown' },
      tags: ['gdrive', operation],
    });

    let output: GDriveOperationOutput;

    switch (operation) {
      case 'search':
        if (!query) {
          throw new Error('query is required for search operation');
        }
        output = await this.handleSearch(query, doc_limit);
        break;

      case 'ping':
        output = await this.handlePing();
        break;

      case 'list':
        output = await this.handleList(folderId, doc_limit);
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

  private async handleSearch(query?: string, limit?: number): Promise<ListFilesOutput> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    const allFiles: FileMetadata[] = [];
    let pageToken: string | undefined;
    let resultCount = 0;
    let pageCount = 0;
    let incompleteSearch = false;

    do {
      const options: ListFilesOptions = {
        q: query,
        pageSize: 100,
        pageToken,
      };

      this.workflowLogger.logInfo(
        `Fetching Google Drive files page ${pageCount + 1}${
          pageToken ? ` (continuing from previous page)` : ''
        }`,
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
      resultCount += result.files.length;
      pageCount++;

      if (limit && resultCount > limit) {
        break;
      }

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

  private async handleList(folderId?: string, limit?: number): Promise<ListFilesOutput> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    const allFiles: FileMetadata[] = [];
    let pageToken: string | undefined;
    let resultCount = 0;
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
      resultCount += result.files.length;
      pageCount++;

      if (limit && resultCount > limit) {
        break;
      }

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

  private async handleGet(fileId: string): Promise<FileMetadata> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }

    return this.driveClient.getFile(fileId);
  }

  private async handleDownload(fileId: string): Promise<DownloadFileOutput> {
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
    const downloadedFile = await this.driveClient.downloadFile(fileId);

    this.workflowLogger.logInfo(
      `Successfully downloaded file: ${fileMetadata.name} (${downloadedFile.size} bytes)`,
      {
        workflow: { step_id: this.step.name },
        event: { action: 'gdrive_download', outcome: 'success' },
        tags: ['gdrive', 'download'],
      }
    );

    const fileContent = await this.extractContent(downloadedFile, fileMetadata.name, fileMetadata.mimeType);

    return {
      fileId: fileMetadata.id,
      fileName: fileMetadata.name,
      mimeType: fileMetadata.mimeType,
      size: 999,
      content: fileContent,
      contentEncoding: 'utf8',
      metadata: {
        createdTime: fileMetadata.createdTime,
        modifiedTime: fileMetadata.modifiedTime,
        parents: fileMetadata.parents,
        webViewLink: fileMetadata.webViewLink,
      },
    };
  }

  private async extractContent(
    buffer: Buffer,
    fileName: string,
    contentType: string
  ): Promise<string> {
    try {
      console.log(`Downloading the file ${fileName} with content type {contentType}`);

      const extractedFileContentResponse = await axios.put(
        'http://localhost:8090/extract_text/',
        buffer,
        {
          headers: { 'Content-Type': 'application/octet-stream' },
        }
      );

      console.log(`Subextracted:`);
      console.log(extractedFileContentResponse);

      return extractedFileContentResponse.data.extracted_text;
    } catch (error) {
      throw new Error(`Content extraction failed: ${error.message}. Make sure Extraction Service is running.`);
    }
    return '';
  }

  protected async handleFailure(
    input: GDriveOperationInput,
    error: unknown
  ): Promise<RunStepResult> {
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
