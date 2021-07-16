/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';

import { ToolingLog } from '@kbn/dev-utils';

import { downloadText } from './download';

/**
 * Checksum files are formatted like:
 *
 *   {checksum}  {filename}
 *
 * Sometimes we are dealing with just the checksum value and sometimes
 * with the value of a checksum file, so this classes purpose is to disambiguate
 * between those two value types better and serve as a wrapper for files
 * which contain checksums and expose their checksum hash without needing
 * to just remember if this string is a whole file or just the hash part.
 */
export class ChecksumFile {
  static async fromArchiveUrl(log: ToolingLog, archiveUrl: string) {
    const url = `${archiveUrl}.sha512`;
    const content = await downloadText(log, url);
    return new ChecksumFile(content);
  }

  static async fromArchivePath(log: ToolingLog, archivePath: string) {
    log.verbose('reading checksum for archive at', archivePath);
    const path = `${archivePath}.sha512`;
    try {
      const content = await Fs.readFile(path, 'utf-8');
      return new ChecksumFile(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return;
      }

      throw error;
    }
  }

  public readonly sha512Hex: string;
  constructor(public readonly content: string) {
    this.sha512Hex = content.trim().split(' ')[0];
  }

  eq(other: ChecksumFile | string) {
    return this.sha512Hex === (other instanceof ChecksumFile ? other.sha512Hex : other);
  }

  toString() {
    return `# ${this.sha512Hex}`;
  }
}
