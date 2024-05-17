/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FileKind } from '../../../common/types';

import { FilesRouter } from '../types';

import { enhanceRouter } from './enhance_router';

import * as create from './create';
import * as deleteEndpoint from './delete';
import * as download from './download';
import * as getById from './get_by_id';
import * as list from './list';
import * as getShare from './share/get';
import * as listShare from './share/list';
import * as share from './share/share';
import * as unshare from './share/unshare';
import * as update from './update';
import * as upload from './upload';

/**
 * Register a single file kind's routes
 */
export function registerFileKindRoutes(router: FilesRouter, fileKind: FileKind) {
  const fileKindRouter = enhanceRouter({ router, fileKind: fileKind.id });
  [
    create,
    upload,
    update,
    deleteEndpoint,
    list,
    download,
    getById,
    share,
    unshare,
    getShare,
    listShare,
  ].forEach((route) => {
    route.register(fileKindRouter, fileKind);
  });
}
