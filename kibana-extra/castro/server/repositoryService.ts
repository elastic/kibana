import Git from 'nodegit';
import rimraf from 'rimraf';

import RepositoryUtils from '../common/repositoryUtils';
import { Repository } from '../model';

// This is the service for any kind of repository handling, e.g. clone, update, delete, etc.
export default class RepositoryService {
  private readonly repoVolPath: string;

  constructor(repoVolPath: string) {
    this.repoVolPath = repoVolPath;
  }

  async clone(repo: Repository): Promise<Repository> {
    if (!repo) {
      return null;
    } else {
      const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, repo.uri);
      try {
        const gitRepo = await Git.Clone.clone(
          repo.url,
          localPath
          // {
          //   fetchOpts: {
          //     callbacks: {
          //       transferProgress: (stats) => {
          //         const progress = (100 * (stats.receivedObjects() + stats.indexedObjects())) / (stats.totalObjects() * 2);
          //         return progress;
          //       }
          //     }
          //   }
          // }
        )
        const headCommit = await gitRepo.getHeadCommit();
        console.log(`Clone repository from ${repo.url} to ${localPath} done with head revision ${headCommit.sha()}`);
        return repo;
      } catch (error) {
        const msg = `Clone repository from ${repo.url} to ${localPath} error: ${error}`;
        console.error(msg);
        throw new Error(msg);
      }
    }
  }

async remove(uri: string): Promise<Boolean> {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    // For now, just `rm -rf`
    rimraf(localPath, (error) => {
      if (error) {
        console.error(`Remove ${localPath} error: ${error}.`);
        throw error;
      }
      console.log(`Remove ${localPath} done.`);
    });
    return true;
  }

};