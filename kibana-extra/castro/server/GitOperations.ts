/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Commit, Error, Repository, Tree, TreeEntry } from 'nodegit';
import * as Path from 'path';
import { FileTree, FileTreeItemType, RepositoryUri } from '../model';

/**
 * do a nodegit operation and check the results. If it throws a not found error or returns null,
 * rethrow a Boom.notFound error.
 * @param func the nodegit operation
 * @param message the message pass to Boom.notFound error
 */
async function checkExists<R>(func: () => Promise<R>, message: string): Promise<R> {
  let result: R;
  try {
    result = await func();
  } catch (e) {
    if (e.errno === Error.CODE.ENOTFOUND) {
      throw Boom.notFound(message);
    } else {
      throw e;
    }
  }
  if (result == null) {
    throw Boom.notFound(message);
  }
  return result;
}

function entry2Tree(entry: TreeEntry): FileTree {
  return {
    name: entry.name(),
    path: entry.path(),
    sha1: entry.sha(),
    type: entry.isDirectory()
      ? FileTreeItemType.Directory
      : entry.isSubmodule()
        ? FileTreeItemType.Submodule
        : FileTreeItemType.File,
  };
}

export default class GitOperations {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }
  public async fileContent(uri: RepositoryUri, path: string, revision: string = 'HEAD') {
    const repo = await this.openRepo(uri);
    const commit = await this.getCommit(repo, revision);
    const entry: TreeEntry = await checkExists(
      () => commit.getEntry(path),
      `file ${uri}/${path} not found `
    );
    if (entry.isFile()) {
      return await entry.getBlob();
    } else {
      throw Boom.unsupportedMediaType(`${uri}/${path} is not a file.`);
    }
  }

  public async getCommit(repo: Repository, revision: string): Promise<Commit> {
    if (revision.toUpperCase() === 'HEAD') {
      return await repo.getHeadCommit();
    }
    try {
      return await repo.getBranchCommit(revision);
    } catch (e) {
      if (e.errno === Error.CODE.ENOTFOUND) {
        return checkExists(
          () => repo.getCommit(revision),
          `revision or branch ${revision} not found in ${repo.path()}`
        );
      } else {
        throw e;
      }
    }
  }

  public async openRepo(uri: RepositoryUri): Promise<Repository> {
    const repoDir = Path.join(this.repoRoot, uri);
    return checkExists<Repository>(() => Repository.open(repoDir), `repo ${uri} not found`);
  }

  public async fileTree(
    uri: RepositoryUri,
    path: string,
    revision: string = 'HEAD',
    depth: number = Number.MAX_SAFE_INTEGER
  ): Promise<FileTree> {
    const repo = await this.openRepo(uri);
    const commit = await this.getCommit(repo, revision);
    const tree = await commit.getTree();

    if (path) {
      const entry = await checkExists(
        () => Promise.resolve(tree.getEntry(path)),
        `path ${path} does not exists.`
      );
      if (entry.isDirectory()) {
        return await this.walkTree(entry2Tree(entry), await entry.getTree(), depth);
      } else {
        return entry2Tree(entry);
      }
    } else {
      return await this.walkTree(
        {
          name: '',
          path: '',
          type: FileTreeItemType.Directory,
        },
        tree,
        depth
      );
    }
  }

  private async walkTree(file: FileTree, tree: Tree, depth: number): Promise<FileTree> {
    if (depth > 0) {
      file.children = [];
      for (const entry of tree.entries()) {
        const subDir = entry2Tree(entry);
        if (entry.isDirectory()) {
          await this.walkTree(subDir, await entry.getTree(), depth - 1);
        }
        file.children.push(subDir);
      }
    }
    return file;
  }
}
