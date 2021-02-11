/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';

import { ToolingLog, kibanaPackageJson, REPO_ROOT } from '@kbn/dev-utils';
import execa from 'execa';
import del from 'del';
import archiver from 'archiver';
import tempy from 'tempy';
import extractZip from 'extract-zip';

import { Archives } from './archives';
import { concurrentMap } from '../concurrent_map';

const asyncPipeline = promisify(pipeline);
const OUTDIR_MERGE_BASE_FILENAME = '.ts-ref-cache-merge-base';

export async function getRecentShasFrom(sha: string, size: number) {
  const proc = await execa('git', ['log', '--pretty=%P', `-n`, `${size}`, sha]);
  return proc.stdout
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function getMergeBase(log: ToolingLog, upstreamBranch: string) {
  log.info('ensuring we have the latest changelog from upstream', upstreamBranch);
  await execa('git', ['fetch', 'https://github.com/elastic/kibana.git', upstreamBranch]);

  log.info('determining merge base with upstream');
  const proc = await execa('git', ['merge-base', 'HEAD', 'FETCH_HEAD']);

  const mergeBase = proc.stdout.trim();
  log.info('merge base with', upstreamBranch, 'is', mergeBase);

  return mergeBase;
}

export async function matchMergeBase(outDir: string, sha: string) {
  try {
    const existing = await Fs.readFile(Path.resolve(outDir, OUTDIR_MERGE_BASE_FILENAME), 'utf8');
    return existing === sha;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export async function isDir(path: string) {
  try {
    return (await Fs.stat(path)).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export async function zip(
  dirs: Array<[string, string]>,
  files: Array<[string, string]>,
  outputPath: string
) {
  const archive = archiver('zip', {
    zlib: {
      level: 9,
    },
  });

  for (const [absolute, relative] of dirs) {
    archive.directory(absolute, relative);
  }

  for (const [absolute, relative] of files) {
    archive.file(absolute, {
      name: relative,
    });
  }

  // ensure output dir exists
  await Fs.mkdir(Path.dirname(outputPath), { recursive: true });

  // await the promise from the pipeline and archive.finalize()
  await Promise.all([asyncPipeline(archive, createWriteStream(outputPath)), archive.finalize()]);
}

export class RefOutputCache {
  static async create(log: ToolingLog, workingDir: string, outDirs: string[]) {
    const archives = await Archives.create(log, workingDir);

    const upstreamBranch: string = kibanaPackageJson.branch;
    const mergeBase = await getMergeBase(log, upstreamBranch);

    return new RefOutputCache(log, archives, outDirs, mergeBase);
  }

  constructor(
    private readonly log: ToolingLog,
    private readonly archives: Archives,
    private readonly outDirs: string[],
    private readonly mergeBase: string
  ) {}

  async initCaches() {
    const archive =
      this.archives.get(this.mergeBase) ??
      (await this.archives.getFirstAvailable([
        this.mergeBase,
        ...(await getRecentShasFrom(this.mergeBase, 5)),
      ]));

    if (!archive) {
      return;
    }

    const outdatedOutDirs = (
      await concurrentMap(100, this.outDirs, async (outDir) => ({
        path: outDir,
        outdated: !(await matchMergeBase(outDir, archive.sha)),
      }))
    )
      .filter((o) => o.outdated)
      .map((o) => o.path);

    if (!outdatedOutDirs.length) {
      this.log.debug('all outDirs have the most recent cache');
      return;
    }

    const tmpDir = tempy.directory();
    this.log.debug(
      'extracting',
      archive.path,
      'to rebuild caches in',
      outdatedOutDirs.length,
      'outDirs'
    );
    await extractZip(archive.path, { dir: tmpDir });

    const cacheNames = await Fs.readdir(tmpDir);

    await concurrentMap(50, outdatedOutDirs, async (outDir) => {
      const relative = Path.relative(REPO_ROOT, outDir);
      const cacheName = `${relative.split(Path.sep).join('__')}.zip`;

      if (!cacheNames.includes(cacheName)) {
        this.log.debug(`[${relative}] not in cache`);
        await Fs.mkdir(outDir, { recursive: true });
        await Fs.writeFile(Path.resolve(outDir, OUTDIR_MERGE_BASE_FILENAME), archive.sha);
        return;
      }

      if (await matchMergeBase(outDir, archive.sha)) {
        this.log.debug(`[${relative}] keeping outdir, created from selected sha`);
        return;
      }

      this.log.debug(`[${relative}] clearing outDir and replacing with cache`);
      await del(outDir);
      await extractZip(Path.resolve(tmpDir, cacheName), {
        dir: outDir,
      });
      await Fs.writeFile(Path.resolve(outDir, OUTDIR_MERGE_BASE_FILENAME), archive.sha);
    });
  }

  async captureCache(outputDir: string) {
    const tmpDir = tempy.directory();
    const currentSha = (await execa('git', ['rev-parse', 'HEAD'])).stdout.trim();
    const outputPath = Path.resolve(outputDir, `${currentSha}.zip`);

    this.log.info('writing ts-ref cache to', outputPath);

    const subZips: Array<[string, string]> = [];

    await Promise.all(
      this.outDirs.map(async (absolute) => {
        const relative = Path.relative(REPO_ROOT, absolute);
        const subZipName = `${relative.split(Path.sep).join('__')}.zip`;
        const subZipPath = Path.resolve(tmpDir, subZipName);
        await zip([[absolute, '/']], [], subZipPath);
        subZips.push([subZipPath, subZipName]);
      })
    );

    await zip([], subZips, outputPath);
    await del(tmpDir, { force: true });
    this.log.success('wrote archive to', outputPath);
  }
}
