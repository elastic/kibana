import GitUrlParse from 'git-url-parse';

import { Repository, RepositoryUri } from '../model';

export default class RepositoryUtils {

  // Generate a Repository instance by parsing repository remote url
  // TODO(mengwei): This is a very naive implementation, need improvements.
  static buildRepository(remoteUrl: string): Repository | undefined {
    const repo = GitUrlParse(remoteUrl);
    const uri: RepositoryUri = repo.source + '/' + repo.full_name;
    return {
      uri,
      url: repo.href as string,
      name: repo.name as string,
      org: repo.owner as string
    };
  }

  // Return the local data path of a given repository.
  static repositoryLocalPath(dataPath: string, repoUri: RepositoryUri) {
    return `${process.env.HOME}/${dataPath}/${repoUri}`;
  }
}