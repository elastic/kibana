/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FILES_API_BASE_PATH,
  FILES_SHARE_API_BASE_PATH,
  FILES_PUBLIC_API_BASE_PATH,
  API_BASE_PATH,
} from '../../common/api_routes';

export * from '../../common/api_routes';

export const FILES_API_ROUTES = {
  find: `${API_BASE_PATH}/find`,
  bulkDelete: `${API_BASE_PATH}/blobs`,
  metrics: `${API_BASE_PATH}/metrics`,
  public: {
    download: `${FILES_PUBLIC_API_BASE_PATH}/blob/{fileName?}`,
  },
  fileKind: {
    getCreateFileRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}`,
    getUploadRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}/blob`,
    getDownloadRoute: (fileKind: string) =>
      `${FILES_API_BASE_PATH}/${fileKind}/{id}/blob/{fileName?}`,
    getUpdateRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
    getDeleteRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
    getListRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/list`,
    getByIdRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
    getShareRoute: (fileKind: string) => `${FILES_SHARE_API_BASE_PATH}/${fileKind}/{fileId}`,
    getUnshareRoute: (fileKind: string) => `${FILES_SHARE_API_BASE_PATH}/${fileKind}/{id}`,
    getGetShareRoute: (fileKind: string) => `${FILES_SHARE_API_BASE_PATH}/${fileKind}/{id}`,
    getListShareRoute: (fileKind: string) => `${FILES_SHARE_API_BASE_PATH}/${fileKind}`,
  },
};
