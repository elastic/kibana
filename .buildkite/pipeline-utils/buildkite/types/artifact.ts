/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface Artifact {
  id: string;
  job_id: string;
  url: string;
  download_url: string;
  state: 'new' | 'error' | 'finished' | 'deleted';
  path: string;
  dirname: string;
  filename: string;
  mime_type: string;
  file_size: number;
  glob_path?: string;
  original_path?: string;
  sha1sum: string;
}
