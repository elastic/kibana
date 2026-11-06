/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { pathToFileURL } from 'url';

/**
 * `file://` URL of a tiny product documentation artifact repository, so that test servers
 * resolve `xpack.productDocBase.artifactRepositoryUrl` locally instead of downloading the
 * real artifacts from the CDN.
 */
export const PRODUCT_DOC_STUB_REPOSITORY_URL = pathToFileURL(
  Path.resolve(__dirname, 'product_doc_stub')
).href;
