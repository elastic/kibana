/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import del from 'del';
import fs from 'fs';
import Git from 'nodegit';

import { RepositoryUtils } from '../common/repository_utils';
import {
  CloneProgress,
  CloneWorkerResult,
  DeleteWorkerResult,
  Repository,
  UpdateWorkerResult,
} from '../model';
import { Log } from './log';

export type CloneProgressHandler = (progress: number, cloneProgress?: CloneProgress) => void;

// This is the service for any kind of repository handling, e.g. clone, update, delete, etc.
export class RepositoryService {
  constructor(private readonly repoVolPath: string, private log: Log) {}

  public async clone(repo: Repository, handler?: CloneProgressHandler): Promise<CloneWorkerResult> {
    if (!repo) {
      throw new Error(`Invalid repository.`);
    } else {
      const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, repo.uri);
      if (fs.existsSync(localPath)) {
        this.log.info(`Repository exist in local path: ${localPath}. Do update instead of clone.`);
        try {
          // Do update instead of clone if the local repo exists.
          const updateRes = await this.update(repo.uri);
          return {
            uri: repo.uri,
            repo: {
              ...repo,
              defaultBranch: updateRes.branch,
              revision: updateRes.revision,
            },
          };
        } catch (error) {
          // If failed to update the current git repo living in the disk, clean up the local git repo and
          // move on with the clone.
          await this.remove(repo.uri);
        }
      }

      // Go head with the actual clone.
      try {
        const gitRepo = await Git.Clone.clone(repo.url, localPath, {
          fetchOpts: {
            callbacks: {
              transferProgress: {
                throttle: 50, // Make the progress update less frequent.
                callback: (stats: any) => {
                  const progress =
                    (100 * (stats.receivedObjects() + stats.indexedObjects())) /
                    (stats.totalObjects() * 2);
                  const cloneProgress = {
                    isCloned: false,
                    receivedObjects: stats.receivedObjects(),
                    indexedObjects: stats.indexedObjects(),
                    totalObjects: stats.totalObjects(),
                    localObjects: stats.localObjects(),
                    totalDeltas: stats.totalDeltas(),
                    indexedDeltas: stats.indexedDeltas(),
                    receivedBytes: stats.receivedBytes(),
                  };
                  if (handler) {
                    handler(progress, cloneProgress);
                  }
                },
              },
            },
          },
        });
        const headCommit = await gitRepo.getHeadCommit();
        const headRevision = headCommit.sha();
        const currentBranch = await gitRepo.getCurrentBranch();
        const currentBranchName = currentBranch.shorthand();
        this.log.info(
          `Clone repository from ${
            repo.url
          } to ${localPath} done with head revision ${headRevision} and default branch ${currentBranchName}`
        );
        return {
          uri: repo.uri,
          repo: {
            ...repo,
            defaultBranch: currentBranchName,
            revision: headRevision,
          },
        };
      } catch (error) {
        const msg = `Clone repository from ${repo.url} to ${localPath} error: ${error}`;
        this.log.error(msg);
        throw new Error(msg);
      }
    }
  }

  public async remove(uri: string): Promise<DeleteWorkerResult> {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    try {
      // For now, just `rm -rf`
      await del([localPath]);
      this.log.info(`Remove ${localPath} done.`);
      return {
        uri,
        res: true,
      };
    } catch (error) {
      this.log.error(`Remove ${localPath} error: ${error}.`);
      throw error;
    }
  }

  public async update(uri: string): Promise<UpdateWorkerResult> {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    try {
      const repo = await Git.Repository.open(localPath);
      await repo.fetchAll();
      // TODO(mengwei): deal with the case when the default branch has changed.
      const currentBranch = await repo.getCurrentBranch();
      const currentBranchName = currentBranch.shorthand();
      await repo.mergeBranches(
        currentBranchName,
        `origin/${currentBranchName}`,
        Git.Signature.default(repo),
        Git.Merge.PREFERENCE.FASTFORWARD_ONLY
      );
      const headCommit = await repo.getHeadCommit();
      this.log.debug(`Update repository to revision ${headCommit.sha()}`);
      return {
        uri,
        branch: currentBranchName,
        revision: headCommit.sha(),
      };
    } catch (error) {
      const msg = `update repository ${uri} error: ${error}`;
      this.log.info(msg);
      throw new Error(msg);
    }
  }
}
