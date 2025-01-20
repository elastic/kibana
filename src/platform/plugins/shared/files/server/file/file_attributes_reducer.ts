/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FileHashObj } from '../saved_objects/file';
import { FileJSON, UpdatableFileMetadata } from '../../common';

export type Action =
  | {
      action: 'delete';
      payload?: undefined;
    }
  | {
      action: 'uploading';
      payload?: undefined;
    }
  | {
      action: 'uploaded';
      payload: { size: number; hash?: FileHashObj };
    }
  | { action: 'uploadError'; payload?: undefined }
  | { action: 'updateFile'; payload: Partial<UpdatableFileMetadata> };

export function fileAttributesReducer(state: FileJSON, { action, payload }: Action): FileJSON {
  switch (action) {
    case 'delete':
      return { ...state, status: 'DELETED' };
    case 'uploading':
      return {
        ...state,
        status: 'UPLOADING',
      };
    case 'uploaded':
      return {
        ...state,
        ...payload,
        status: 'READY',
      };
    case 'uploadError':
      return {
        ...state,
        status: 'UPLOAD_ERROR',
      };
    case 'updateFile':
      return {
        ...state,
        name: payload.name ?? state.name,
        alt: payload.alt ?? state.alt,
        meta: payload.meta ?? state.meta,
      };
    default:
      return state;
  }
}
