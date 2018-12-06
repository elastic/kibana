/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import mkdirp from 'mkdirp';
import fetch from 'node-fetch';
import path from 'path';
import tar from 'tar-fs';
import zlib from 'zlib';
import { InstallationType, InstallEvent, InstallEventType } from '../../common/installation';
import { LanguageServerStatus } from '../../common/language_server';
import { ServerOptions } from '../server_options';
import { LanguageServerDefinition } from './language_servers';

const DOWNLOAD_PROGRESS_WEIGHT = 0.9;

export class InstallManager {
  private eventEmitter = new EventEmitter();
  private readonly basePath: string;
  private installing: Set<LanguageServerDefinition> = new Set();

  constructor(readonly serverOptions: ServerOptions) {
    this.basePath = serverOptions.langServerPath;
  }

  public status(def: LanguageServerDefinition): LanguageServerStatus {
    if (def.installationType === InstallationType.Embed) {
      return LanguageServerStatus.READY;
    }
    if (this.installing.has(def)) {
      return LanguageServerStatus.INSTALLING;
    }
    const installationPath = this.installationPath(def);
    return fs.existsSync(installationPath)
      ? LanguageServerStatus.READY
      : LanguageServerStatus.NOT_INSTALLED;
  }

  public on(fn: (event: InstallEvent) => void) {
    this.eventEmitter.on('event', fn);
  }

  public async install(def: LanguageServerDefinition) {
    try {
      this.installing.add(def);
      const packageFile = await this.downloadFile(def);
      await this.unPack(packageFile, def);
      this.sendEvent({
        langServerName: def.name,
        eventType: InstallEventType.DONE,
        progress: 1,
        message: `install ${def.name} done.`,
      });
    } catch (e) {
      this.sendEvent({
        langServerName: def.name,
        eventType: InstallEventType.FAIL,
        message: `install ${def.name} failed. error: ${e.message}`,
      });
      throw e;
    } finally {
      this.installing.delete(def);
    }
  }

  public async downloadFile(def: LanguageServerDefinition): Promise<string> {
    const url = typeof def.downloadUrl === 'function' ? def.downloadUrl(def) : def.downloadUrl;

    const res = await fetch(url!);
    if (!res.ok) {
      throw new Error(`Unable to download language server ${def.name} from url ${url}`);
    }

    const installationPath = this.installationPath(def);
    let filename: string;
    const header = res.headers.get('Content-Disposition');
    const FILE_NAME_HEAD_PREFIX = 'filename=';
    if (header && header.includes(FILE_NAME_HEAD_PREFIX)) {
      filename = header.substring(
        header.indexOf(FILE_NAME_HEAD_PREFIX) + FILE_NAME_HEAD_PREFIX.length
      );
    } else {
      filename = `${def.name}-${def.version}.tar.gz`;
    }
    const downloadPath = path.resolve(installationPath, '..', filename);
    mkdirp.sync(installationPath);
    const stream = fs.createWriteStream(downloadPath);
    const total = parseInt(res.headers.get('Content-Length') || '0', 10);
    let downloaded = 0;
    return await new Promise<string>((resolve, reject) => {
      res
        // @ts-ignore
        .body!.pipe(stream)
        .on('error', (error: any) => {
          reject(error);
        })
        .on('data', (data: Buffer) => {
          downloaded += data.length;
          this.sendEvent({
            langServerName: def.name,
            eventType: InstallEventType.DOWNLOADING,
            progress: DOWNLOAD_PROGRESS_WEIGHT * (downloaded / total),
            message: `downloading ${filename}(${downloaded}/${total})`,
            params: {
              downloaded,
              total,
            },
          });
        })
        .on('finish', () => {
          if (res.ok) {
            resolve(downloadPath);
          } else {
            reject(new Error(res.statusText));
          }
        });
    });
  }

  public installationPath(def: LanguageServerDefinition): string {
    if (def.installationType === InstallationType.Embed) {
      return def.embedPath!;
    } else {
      let version = def.version!;
      if (def.build) {
        version += '-' + def.build;
      }
      return path.join(this.basePath, def.installationFolderName || def.name, version);
    }
  }

  private async unPack(packageFile: string, def: LanguageServerDefinition) {
    const dest = this.installationPath(def);
    this.sendEvent({
      langServerName: def.name,
      eventType: InstallEventType.UNPACKING,
      progress: DOWNLOAD_PROGRESS_WEIGHT,
      message: `unpacking ${path.basename(packageFile)}`,
    });
    const ext = path.extname(packageFile);
    switch (ext) {
      case '.gz':
        await this.unPackTarball(packageFile, dest);
        break;
      default:
        // todo support .zip
        throw new Error(`unknown extension "${ext}"`);
    }
    // await decompress(packageFile, '/tmp/1/1');
  }

  private sendEvent(event: InstallEvent) {
    this.eventEmitter.emit('event', event);
  }

  private unPackTarball(packageFile: string, dest: string) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(packageFile)
        .on('error', reject)
        .pipe(zlib.createGunzip())
        .on('error', reject)
        .pipe(tar.extract(dest))
        .on('error', reject)
        .on('finish', resolve);
    });
  }
}
