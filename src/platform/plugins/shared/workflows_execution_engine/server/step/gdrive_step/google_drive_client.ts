/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GoogleAuth } from 'google-auth-library';
import axios, { type AxiosRequestConfig } from 'axios';

const DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_API_TIMEOUT = 60 * 1000; // 1 minute

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

export interface GoogleDriveClientConfig {
  service_credential: Record<string, any>;
  subject?: string; // For domain-wide delegation
}

export interface ListFilesOptions {
  folderId?: string;
  pageSize?: number;
  pageToken?: string;
  q?: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
  [key: string]: any;
}

export interface ListFilesResponse {
  files: FileMetadata[];
  nextPageToken?: string;
  incompleteSearch?: boolean;
}

export class GoogleDriveClient {
  private auth: GoogleAuth;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private config: GoogleDriveClientConfig) {
    const credentials = { ...config.service_credential };

    // Remove universe_domain if present (not needed for auth)
    if (credentials.universe_domain) {
      delete credentials.universe_domain;
    }

    // Add subject for domain-wide delegation if provided
    if (config.subject) {
      credentials.subject = config.subject;
    }

    this.auth = new GoogleAuth({
      credentials,
      scopes: DRIVE_SCOPES,
    });
  }

  /**
   * Get an access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Refresh token if expired or about to expire (within 5 minutes)
    if (!this.accessToken || this.tokenExpiry <= now + 5 * 60 * 1000) {
      const tokenResponse = await this.auth.getAccessToken();

      if (!tokenResponse) {
        throw new Error('Failed to retrieve access token from Google Auth');
      }

      this.accessToken = tokenResponse;
      // Tokens typically expire in 1 hour, set expiry to 55 minutes to be safe
      this.tokenExpiry = now + 55 * 60 * 1000;
    }

    return this.accessToken;
  }

  /**
   * Make an authenticated request to the Google Drive API
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    params?: Record<string, any>,
    data?: any
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = `${DRIVE_API_BASE_URL}${endpoint}`;

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params,
      data,
      timeout: DRIVE_API_TIMEOUT,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Google Drive API error: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`
        );
      }
      throw new Error(`Google Drive API request failed: ${error.message}`);
    }
  }

  /**
   * Ping the Google Drive API to verify connectivity
   */
  async ping(): Promise<{ kind: string }> {
    return this.makeRequest<{ kind: string }>('GET', '/about', {
      fields: 'kind',
    });
  }

  /**
   * List files from Google Drive
   */
  async listFiles(options: ListFilesOptions = {}): Promise<ListFilesResponse> {
    const {
      folderId,
      pageSize = 100,
      pageToken,
      q: customQuery,
    } = options;

    // Build query
    let query = 'trashed=false';

    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    if (customQuery) {
      query = customQuery;
    }

    const params: Record<string, any> = {
      q: query,
      pageSize,
      fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink)',
      corpora: 'allDrives',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    return this.makeRequest<ListFilesResponse>('GET', '/files', params);
  }

  /**
   * Get file metadata by ID
   */
  async getFile(fileId: string): Promise<FileMetadata> {
    if (!fileId) {
      throw new Error('fileId is required for get operation');
    }

    return this.makeRequest<FileMetadata>('GET', `/files/${fileId}`, {
      fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink',
      supportsAllDrives: true,
    });
  }

  /**
   * Download file content by ID
   * Returns the file content as base64-encoded string for binary files or plain text for text files
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    if (!fileId) {
      throw new Error('fileId is required for download operation');
    }
    const accessToken = await this.getAccessToken();

    const config = {
      headers: { Authorization: `Bearer ${accessToken}` },
    };


    try {
      console.log('Downloading the file');
      console.log(`https://www.googleapis.com/drive/v3/files/${fileId}/download`);

      const downloadResponse = await axios.post(
        `https://www.googleapis.com/drive/v3/files/${fileId}/download`,
        {},
        config
      );
      console.log(downloadResponse);

      console.log('Actually downloading it');
      const fileContentResponse = await axios.get(downloadResponse.data.response.downloadUri, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = fileContentResponse.data;

      return data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `Google Drive API error downloading file: ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`
        );
      }
      throw new Error(`Google Drive file download failed: ${error.message}`);
    }
  }
}

