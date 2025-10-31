/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { File } from '../../file';

export interface TestResponse {
  test: string;
  errors: string[];
}

export class PreflightCheck {
  id: string = '';
  files: Map<string, { path: string; file: File }> = new Map();
  flags: Record<string, any> = {};
  log: ToolingLog;

  constructor({ flags = {}, log }: { flags: Record<string, any>; log: ToolingLog }) {
    this.flags = flags;
    this.log = log;
  }

  public getId = () => this.id;

  public setFiles(files: Array<{ path: string; file: File }>) {
    for (const { path, file } of files) {
      this.files.set(path, { path, file });
    }
  }

  public getFiles() {
    return Array.from(this.files.values());
  }
}
