/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import GitUrlParse from 'git-url-parse';
import path from 'path';
import { Location } from 'vscode-languageserver';

import { CloneProgress, FileTree, FileTreeItemType, Repository, RepositoryUri } from '../model';
import { parseLspUrl, toCanonicalUrl } from './uri_util';

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

  // From uri 'origin/org/name' to 'name'
  public static repoNameFromUri(repoUri: RepositoryUri): string {
    const segs = repoUri.split('/');
    if (segs && segs.length === 3) {
      return segs[2];
    } else {
      return 'invalid';
    }
  }

  // From uri 'origin/org/name' to 'org/name'
  public static repoFullNameFromUri(repoUri: RepositoryUri): string {
    const segs = repoUri.split('/');
    if (segs && segs.length === 3) {
      return segs[1] + '/' + segs[2];
    } else {
      return 'invalid';
    }
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
    const url = parseLspUrl(loc.uri);
    const { repoUri, file, revision } = url;
    if (repoUri && file && revision) {
      return toCanonicalUrl({ repoUri, file, revision, position: loc.range.start });
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

  public static hasFullyCloned(cloneProgress?: CloneProgress | null): boolean {
    return !!cloneProgress && cloneProgress.isCloned !== undefined && cloneProgress.isCloned;
  }
}
