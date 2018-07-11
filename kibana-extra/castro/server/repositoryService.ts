import Git from 'nodegit';
import rimraf from 'rimraf';

import RepositoryUtils from '../common/repositoryUtils';
import { Repository } from '../common/models';

// This is the service for any kind of repository handling, e.g. clone, update, delete, etc.
// For repository data reading, please refer to RepositoryDataService class.
export default class RepositoryService {
  private readonly repoVolPath: string;

  constructor(repoVolPath: string) {
    this.repoVolPath = repoVolPath;
  }

  // TODO: make this async
  clone(repo: Repository): Repository {
    if (!repo) {
      return null;
    } else {
      const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, repo.uri);
      Git.Clone.clone(
        repo.url, 
        localPath
        // {
        //   fetchOpts: {
        //     callbacks: {
        //       transferProgress: (stats) => {
        //         const progress = (100 * (stats.receivedObjects() + stats.indexedObjects())) / (stats.totalObjects() * 2);
        //         // console.log(`## progress: ${progress}`)
        //         return progress;
        //       }
        //     }
        //   }
        // }
      ).then((repo: Git.Repository) => {
        return repo.getHeadCommit()
      }).then((commit: Git.Commit) => {
        console.log(`Clone repository from ${repo.url} to ${localPath} done with head revision ${commit.sha()}`);
      }).catch(error => {
        console.error(`Clone repository from ${repo.url} to ${localPath} error: ${error}`);
      });
      return repo;
    }
  }

  remove(uri: string): Boolean {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    // For now, just `rm -rf`
    rimraf(localPath, () => {
      console.log(`Remove ${localPath} done.`);
    });
    return true;
  }

};