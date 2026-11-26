/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import {
  API_BASE_PATH,
  getProfileFileName,
  type ProfileType,
  type ProfilerStatusResponse,
} from '../../common';

export interface ProfileFile {
  readonly fileName: string;
  readonly blob: Blob;
}

const FILE_NAME_PATTERN = /filename="([^"]+)"/;

/** Fetches which profiles are currently running on the server. */
export async function fetchProfilerStatus(http: HttpStart): Promise<ProfilerStatusResponse> {
  return await http.get<ProfilerStatusResponse>(`${API_BASE_PATH}/status`);
}

/** Starts a profile on the server. */
export async function startProfile(http: HttpStart, type: ProfileType): Promise<void> {
  await http.post(buildPath(`${API_BASE_PATH}/{type}_profile/start`, { type }));
}

/** Stops a profile on the server and returns its contents with the file name chosen by the server. */
export async function stopProfile(http: HttpStart, type: ProfileType): Promise<ProfileFile> {
  const { body, response } = await http.post<object>(
    buildPath(`${API_BASE_PATH}/{type}_profile/stop`, { type }),
    { asResponse: true }
  );

  const contentDisposition = response?.headers.get('content-disposition') ?? '';
  const [, fileName = getProfileFileName(type, new Date())] =
    FILE_NAME_PATTERN.exec(contentDisposition) ?? [];

  return { fileName, blob: new Blob([JSON.stringify(body)], { type: 'application/json' }) };
}
