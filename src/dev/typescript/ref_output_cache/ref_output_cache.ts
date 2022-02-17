/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';

import { ToolingLog, extract } from '@kbn/dev-utils';
import { kibanaPackageJson } from '@kbn/utils';
import del from 'del';
import tempy from 'tempy';

import { Archives } from './archives';
import { zip } from './zip';
import { concurrentMap } from '../concurrent_map';
import { RepoInfo } from './repo_info';
import { ProjectSet } from '../project_set';

export const OUTDIR_MERGE_BASE_FILENAME = '.ts-ref-cache-merge-base';

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

export class RefOutputCache {
  static async create(options: {
    log: ToolingLog;
    workingDir: string;
    projects: ProjectSet;
    repoRoot: string;
    upstreamUrl: string;
  }) {
    const repoInfo = new RepoInfo(options.log, options.repoRoot, options.upstreamUrl);
    const archives = await Archives.create(options.log, options.workingDir);

    const upstreamBranch: string = kibanaPackageJson.branch;
    const mergeBase = await repoInfo.getMergeBase('HEAD', upstreamBranch);

    return new RefOutputCache(options.log, repoInfo, archives, options.projects, mergeBase);
  }

  constructor(
    private readonly log: ToolingLog,
    private readonly repo: RepoInfo,
    public readonly archives: Archives,
    private readonly projects: ProjectSet,
    private readonly mergeBase: string
  ) {}

  /**
   * Find the most recent cache/archive of the outDirs and replace the outDirs
   * on disk with the files in the cache if the outDir has an outdated merge-base
   * written to the directory.
   */
  async initCaches() {
    const outdatedOutDirs = (
      await concurrentMap(100, this.projects.outDirs, async (outDir) => ({
        path: outDir,
        outdated: !(await matchMergeBase(outDir, this.mergeBase)),
      }))
    )
      .filter((o) => o.outdated)
      .map((o) => o.path);

    if (!outdatedOutDirs.length) {
      this.log.debug('all outDirs have a recent cache');
      return;
    }

    const archive =
      this.archives.get(this.mergeBase) ??
      (await this.archives.getFirstAvailable([
        this.mergeBase,
        ...(await this.repo.getRecentShasFrom(this.mergeBase, 5)),
      ]));

    if (!archive) {
      return;
    }

    const changedFiles = await this.repo.getFilesChangesSinceSha(archive.sha);
    const outDirsForcingExtraCacheCheck = this.projects.filterByPaths(changedFiles).outDirs;

    const tmpDir = tempy.directory();
    this.log.debug(
      'extracting',
      this.repo.getRelative(archive.path),
      'to rebuild caches in',
      outdatedOutDirs.length,
      'outDirs'
    );
    await extract({
      archivePath: archive.path,
      targetDir: tmpDir,
    });

    const cacheNames = await Fs.readdir(tmpDir);
    const beginningOfTime = new Date(0);

    await concurrentMap(50, outdatedOutDirs, async (outDir) => {
      const relative = this.repo.getRelative(outDir);
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

      const setModifiedTimes = outDirsForcingExtraCacheCheck.includes(outDir)
        ? beginningOfTime
        : undefined;

      if (setModifiedTimes) {
        this.log.debug(`[${relative}] replacing outDir with cache (forcing revalidation)`);
      } else {
        this.log.debug(`[${relative}] clearing outDir and replacing with cache`);
      }

      await del(outDir);
      await extract({
        archivePath: Path.resolve(tmpDir, cacheName),
        targetDir: outDir,
        setModifiedTimes,
      });
      await Fs.writeFile(Path.resolve(outDir, OUTDIR_MERGE_BASE_FILENAME), this.mergeBase);
    });
  }

  /**
   * Iterate through the outDirs, zip them up, and then zip up those zips
   * into a single file which we can upload/download/extract just a portion
   * of the archive.
   *
   * @param outputDir directory that the {HEAD}.zip file should be written to
   */
  async captureCache(outputDir: string) {
    const tmpDir = tempy.directory();
    const currentSha = await this.repo.getHeadSha();
    const outputPath = Path.resolve(outputDir, `${currentSha}.zip`);
    const relativeOutputPath = this.repo.getRelative(outputPath);

    this.log.debug('writing ts-ref cache to', relativeOutputPath);

    const subZips: Array<[string, string]> = [];

    await Promise.all(
      this.projects.outDirs.map(async (absolute) => {
        const relative = this.repo.getRelative(absolute);
        const subZipName = `${relative.split(Path.sep).join('__')}.zip`;
        const subZipPath = Path.resolve(tmpDir, subZipName);
        await zip([[absolute, '/']], [], subZipPath);
        subZips.push([subZipPath, subZipName]);
      })
    );

    await zip([], subZips, outputPath);
    await del(tmpDir, { force: true });
    this.log.success('wrote archive to', relativeOutputPath);
  }

  /**
   * Cleanup the downloaded cache files, keeping the 10 newest files. Each file
   * is about 25-30MB, so 10 downloads is a a decent amount of disk space for
   * caches but we could potentially increase this number in the future if we like
   */
  async cleanup() {
    // sort archives by time desc
    const archives = [...this.archives].sort((a, b) => b.time - a.time);

    // delete the 11th+ archive
    for (const { sha } of archives.slice(10)) {
      await this.archives.delete(sha);
    }
  }
}
