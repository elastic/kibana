/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type RepositoryUri = string;

export interface Repository {
  /** In the form of git://github.com/lambdalab/lambdalab  */
  uri: RepositoryUri;
  /** Original Clone Url */
  url: string;
  name?: string;
  org?: string;
  defaultBranch?: string;
  revision?: string;
  // The timestamp of next update for this repository.
  nextUpdateTimestamp?: Date;
  // The timestamp of next index for this repository.
  nextIndexTimestamp?: Date;
}

export interface FileTree {
  name: string;
  type: FileTreeItemType;

  /** Full Path of the tree, don't need to be set by the server */
  path?: string;
  /**
   * Children of the file tree, if it is undefined, then it's a file, if it is null, it means it is a
   * directory and its children haven't been evaluated.
   */
  children?: FileTree[];
  sha1?: string;
  /**
   *  current repo uri
   */
  repoUri?: string;
}

export enum FileTreeItemType {
  File,
  Directory,
  Submodule,
}

export interface WorkerResult {
  uri: string;
}

// TODO(mengwei): create a AbstractGitWorkerResult since we now have an
// AbstractGitWorker now.
export interface CloneWorkerResult extends WorkerResult {
  repo: Repository;
}

export interface DeleteWorkerResult extends WorkerResult {
  res: boolean;
}

export interface UpdateWorkerResult extends WorkerResult {
  branch: string;
  revision: string;
}

export enum IndexStatsKey {
  File = 'file-count',
  Symbol = 'symbol-count',
  Reference = 'reference-count',
}
export type IndexStats = Map<IndexStatsKey, number>;

export interface IndexWorkerResult extends WorkerResult {
  revision: string;
  stats: IndexStats;
}

export interface WorkerProgress {
  // Job payload repository uri.
  uri: string;
  progress: number;
  timestamp: Date;
  revision?: string;
}

export interface CloneProgress {
  isCloned?: boolean;
  receivedObjects: number;
  indexedObjects: number;
  totalObjects: number;
  localObjects: number;
  totalDeltas: number;
  indexedDeltas: number;
  receivedBytes: number;
}

export interface CloneWorkerProgress extends WorkerProgress {
  cloneProgress?: CloneProgress;
}
