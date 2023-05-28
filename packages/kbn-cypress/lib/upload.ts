/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Debug from 'debug';
import fs from 'fs';
import { makeRequest } from './httpClient';
const readFile = fs.promises.readFile;
const debug = Debug('currents:upload');

export function uploadVideo(file: string, url: string) {
  return uploadFile(file, url, 'video/mp4');
}

export function uploadImage(file: string, url: string) {
  return uploadFile(file, url, 'image/png');
}

type UploadTypes = 'video/mp4' | 'image/png' | 'plain/text';
async function uploadFile(file: string, url: string, type: UploadTypes) {
  debug('uploading file "%s" to "%s"', file, url);
  const f = await readFile(file);
  await makeRequest({
    url,
    method: 'PUT',
    data: f,
    headers: {
      'Content-Type': type,
    },
  });
}
