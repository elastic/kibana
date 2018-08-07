/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import GitUrlParse from 'git-url-parse';
import path from 'path';
import Url from 'url';
import { Location } from 'vscode-languageserver';

import { Repository, RepositoryUri } from '../model';

export class RepositoryUtils {
  // Generate a Repository instance by parsing repository remote url
  // TODO(mengwei): This is a very naive implementation, need improvements.
  public static buildRepository(remoteUrl: string): Repository {
    const repo = GitUrlParse(remoteUrl);
    const uri: RepositoryUri = repo.source + '/' + repo.full_name;
    return {
      uri,
      url: repo.href as string,
      name: repo.name as string,
      org: repo.owner as string,
    };
  }

  // Return the local data path of a given repository.
  public static repositoryLocalPath(repoPath: string, repoUri: RepositoryUri) {
    return path.join(repoPath, repoUri);
  }

  public static normalizeRepoUriToIndexName(repoUri: RepositoryUri) {
    return repoUri
      .split('/')
      .join('-')
      .toLowerCase();
  }

  public static locationToUrl(loc: Location) {
    const url = Url.parse(loc.uri);
    const { hostname, pathname, query, hash } = url;
    if (hostname && pathname && hash && query) {
      const repoUri = hostname + pathname;
      const revision = query;
      const p = hash.slice(1, hash.length);
      const { line, character } = loc.range.start;
      return `/${repoUri}/${revision}/${p}!L${line + 1}:${character}`;
    }
    return '';
  }
}
