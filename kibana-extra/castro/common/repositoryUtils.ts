import GitUrlParse from 'git-url-parse';

import { Repository } from './models';

export default class RepositoryUtils {

  // Generate a Repository instance by parsing repository remote url
  // TODO: This is a very naive implementation, need improvements.
  static buildRepository(remoteUrl: string): Repository | undefined {
    const repo = GitUrlParse(remoteUrl);
    const uri: string = repo.source + '/' + repo.full_name;
    return {
      uri,
      url: repo.href as string,
      name: repo.name as string,
      org: repo.owner as string
    };
  }
  static repositoryLocalPath(dataPath: string, repoUri: string) {
    return `${process.env.HOME}/${dataPath}/${repoUri}`;
  }
}