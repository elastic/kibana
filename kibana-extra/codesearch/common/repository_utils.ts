/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import GitUrlParse from 'git-url-parse';
import path from 'path';
import Url from 'url';
import { Location } from 'vscode-languageserver';

import { FileTree, FileTreeItemType, Repository, RepositoryUri } from '../model';

export class RepositoryUtils {
  // Generate a Repository instance by parsing repository remote url
  public static buildRepository(remoteUrl: string): Repository {
    const repo = GitUrlParse(remoteUrl);
    const host = repo.source ? repo.source : '';
    const name = repo.name ? repo.name : '_';
    const org = repo.owner ? repo.owner.split('/').join('_') : '_';
    const uri: RepositoryUri = host ? `${host}/${org}/${name}` : repo.full_name;
    return {
      uri,
      url: repo.href as string,
      name,
      org,
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
      return `/${repoUri}/blob/${revision}/${p}!L${line + 1}:${character}`;
    }
    return '';
  }

  public static getAllFiles(fileTree: FileTree): string[] {
    if (!fileTree) {
      return [];
    }
    let result: string[] = [];
    switch (fileTree.type) {
      case FileTreeItemType.File:
        result.push(fileTree.path!);
        break;
      case FileTreeItemType.Directory:
        for (const node of fileTree.children!) {
          result = result.concat(RepositoryUtils.getAllFiles(node));
        }
        break;
      default:
        break;
    }
    return result;
  }
}
