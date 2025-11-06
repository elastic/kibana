/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import Fs from 'fs';
import Path from 'path';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import type { SomeDevLog } from '@kbn/some-dev-log';
import globby from 'globby';
import { asyncForEachWithLimit } from '@kbn/std';
import {
  ARCHIVE_FILE_NAME,
  ARCHIVE_METADATA_FILE_NAME,
  CACHE_IGNORE_GLOBS,
  GCLOUD_ACTIVATE_SCRIPT,
  GCS_BUCKET_URI,
  GCS_COMMITS_PREFIX,
  GCS_PULL_REQUESTS_PREFIX,
  LOCAL_CACHE_ROOT,
  LOCAL_METADATA_RELATIVE_PATH,
  TYPES_DIRECTORY_GLOB,
  TYPE_CHECK_CONFIG_GLOB,
} from './constants';

export interface ArchiveMetadata {
  commitSha: string;
  createdAt: string;
  prNumber?: string | null;
}

export interface PullRequestArchiveMetadata {
  prNumber: string;
  commits: ArchiveMetadata[];
  updatedAt: string;
}

export interface RemoteArchiveUris {
  archiveUri: string;
  metadataUri: string;
}

export type ArchiveCandidate =
  | {
      kind: 'local';
      archivePath: string;
      sha: string;
    }
  | {
      kind: 'remote';
      remotePath: string;
      sha: string;
      source: 'commit' | 'pull-request';
      metadata?: ArchiveMetadata;
    };

const MAX_PULL_REQUEST_COMMITS = 10;

export const getPullRequestNumber = (): string | undefined => {
  const value = process.env.BUILDKITE_PULL_REQUEST ?? '';
  if (value.length === 0 || value === 'false') {
    return undefined;
  }

  return value;
};

export const buildCommitRemoteUris = (sha: string): RemoteArchiveUris => ({
  archiveUri: `${GCS_COMMITS_PREFIX}/${sha}/${ARCHIVE_FILE_NAME}`,
  metadataUri: `${GCS_COMMITS_PREFIX}/${sha}/${ARCHIVE_METADATA_FILE_NAME}`,
});

export const buildPullRequestRemoteUris = (prNumber: string): RemoteArchiveUris => ({
  archiveUri: `${GCS_PULL_REQUESTS_PREFIX}/${prNumber}/${ARCHIVE_FILE_NAME}`,
  metadataUri: `${GCS_PULL_REQUESTS_PREFIX}/${prNumber}/${ARCHIVE_METADATA_FILE_NAME}`,
});

export const resolveLocalMetadataPath = (sha: string) =>
  Path.join(LOCAL_CACHE_ROOT, `${sha}.meta.json`);

export const readLocalArchiveMetadata = async (
  sha: string
): Promise<ArchiveMetadata | undefined> => {
  const metadataPath = resolveLocalMetadataPath(sha);
  try {
    const content = await Fs.promises.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(content) as ArchiveMetadata;
    if (!metadata.commitSha || !metadata.createdAt) {
      return undefined;
    }

    return metadata;
  } catch (error) {
    return undefined;
  }
};

export interface RestoreMetadataDocument {
  restoredAt: string;
  commitSha: string;
  source: 'local' | 'remote-commit' | 'remote-pull-request';
  archivePath: string;
  metadata?: ArchiveMetadata;
}

export const writeRestoreMetadataDocument = async (candidate: ArchiveCandidate): Promise<void> => {
  const restoredAt = new Date().toISOString();
  const metadata =
    candidate.kind === 'remote'
      ? candidate.metadata
      : await readLocalArchiveMetadata(candidate.sha);

  const document: RestoreMetadataDocument = {
    restoredAt,
    commitSha: candidate.sha,
    source:
      candidate.kind === 'remote'
        ? candidate.source === 'pull-request'
          ? 'remote-pull-request'
          : 'remote-commit'
        : 'local',
    archivePath: candidate.kind === 'remote' ? candidate.remotePath : candidate.archivePath,
    metadata: metadata ?? undefined,
  };

  const destinationPath = Path.resolve(REPO_ROOT, LOCAL_METADATA_RELATIVE_PATH);
  await Fs.promises.mkdir(Path.dirname(destinationPath), { recursive: true });
  await Fs.promises.writeFile(destinationPath, JSON.stringify(document, null, 2));
};

const TAR_PLATFORM_OPTIONS =
  process.platform === 'linux'
    ? ['--no-same-owner', '--no-same-permissions', '--numeric-owner', '--delay-directory-restore']
    : [];

export const getTarPlatformOptions = () => TAR_PLATFORM_OPTIONS;

export async function resolveCurrentCommitSha(): Promise<string | undefined> {
  if (process.env.BUILDKITE_COMMIT) {
    return process.env.BUILDKITE_COMMIT;
  }

  const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT });
  const sha = stdout.trim();
  return sha.length > 0 ? sha : undefined;
}

export async function readRecentCommitShas(limit: number): Promise<string[]> {
  const { stdout } = await execa('git', ['rev-list', '--max-count', String(limit), 'HEAD'], {
    cwd: REPO_ROOT,
  });
  return stdout
    .split('\n')
    .map((sha: string) => sha.trim())
    .filter((sha: string) => sha.length > 0);
}

export function isCiEnvironment() {
  return (process.env.CI ?? '').toLowerCase() === 'true';
}

export async function withGcsAuth<TReturn>(
  log: SomeDevLog,
  action: () => Promise<TReturn>
): Promise<TReturn> {
  await execa(GCLOUD_ACTIVATE_SCRIPT, [GCS_BUCKET_URI], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  try {
    return await action();
  } finally {
    try {
      await execa(GCLOUD_ACTIVATE_SCRIPT, ['--unset-impersonation'], {
        cwd: REPO_ROOT,
        stdio: 'inherit',
      });
    } catch (unsetError) {
      const unsetErrorDetails =
        unsetError instanceof Error ? unsetError.message : String(unsetError);
      log.warning(`Failed to unset GCP impersonation: ${unsetErrorDetails}`);
    }
  }
}

export async function ensureLocalCacheRoot() {
  await Fs.promises.mkdir(LOCAL_CACHE_ROOT, { recursive: true });
}

export function buildCandidateShaList(currentSha: string | undefined, history: string[]): string[] {
  const uniqueShas = new Set<string>();

  if (currentSha) {
    uniqueShas.add(currentSha);
  }

  for (const sha of history) {
    if (sha) {
      uniqueShas.add(sha);
    }
  }

  return Array.from(uniqueShas);
}

const readRemoteFile = async (remotePath: string): Promise<string | undefined> => {
  const commands: Array<[cmd: string, args: string[]]> = [
    ['gcloud', ['storage', 'cat', remotePath]],
    ['gsutil', ['cat', remotePath]],
  ];

  for (const [cmd, args] of commands) {
    try {
      const { stdout } = await execa(cmd, args, {
        cwd: REPO_ROOT,
        stderr: 'ignore',
      });
      return stdout;
    } catch (error) {
      continue;
    }
  }

  return undefined;
};

export const readRemoteArchiveMetadata = async (
  remoteMetadataUri: string
): Promise<ArchiveMetadata | undefined> => {
  const raw = await readRemoteFile(remoteMetadataUri);
  if (!raw) {
    return undefined;
  }

  try {
    const metadata = JSON.parse(raw) as ArchiveMetadata;
    if (!metadata.commitSha || !metadata.createdAt) {
      return undefined;
    }

    return metadata;
  } catch (error) {
    return undefined;
  }
};

export const readRemotePullRequestMetadata = async (
  remoteMetadataUri: string
): Promise<PullRequestArchiveMetadata | undefined> => {
  const raw = await readRemoteFile(remoteMetadataUri);
  if (!raw) {
    return undefined;
  }

  try {
    const metadata = JSON.parse(raw) as PullRequestArchiveMetadata;
    if (!metadata?.prNumber || !Array.isArray(metadata.commits)) {
      return undefined;
    }

    const validCommits = metadata.commits.filter((entry) => Boolean(entry?.commitSha));
    if (validCommits.length === 0) {
      return undefined;
    }

    return {
      ...metadata,
      commits: validCommits,
    };
  } catch (error) {
    return undefined;
  }
};

export const mergePullRequestMetadata = (
  prNumber: string,
  existing: PullRequestArchiveMetadata | undefined,
  entry: ArchiveMetadata
): PullRequestArchiveMetadata => {
  const uniqueCommits = new Map<string, ArchiveMetadata>();
  uniqueCommits.set(entry.commitSha, entry);

  if (existing) {
    for (const commit of existing.commits) {
      if (commit.commitSha && !uniqueCommits.has(commit.commitSha)) {
        uniqueCommits.set(commit.commitSha, commit);
      }
    }
  }

  const commits = Array.from(uniqueCommits.values()).slice(0, MAX_PULL_REQUEST_COMMITS);

  return {
    prNumber,
    commits,
    updatedAt: new Date().toISOString(),
  };
};

export async function locateLocalArchive(shas: string[]): Promise<ArchiveCandidate | undefined> {
  try {
    await Fs.promises.access(LOCAL_CACHE_ROOT);
  } catch (error) {
    return undefined;
  }

  for (const sha of shas) {
    const candidatePath = Path.join(LOCAL_CACHE_ROOT, `${sha}.tar.gz`);
    try {
      await Fs.promises.access(candidatePath);
      return { kind: 'local', archivePath: candidatePath, sha };
    } catch (error) {
      continue;
    }
  }

  return undefined;
}

const remoteArchiveExists = async (remotePath: string): Promise<boolean> => {
  // use whichever gcs cli is available
  const commands: Array<[cmd: string, args: string[]]> = [
    ['gcloud', ['storage', 'ls', '--uri', remotePath]],
    ['gsutil', ['-q', 'ls', remotePath]],
  ];

  for (const [cmd, args] of commands) {
    try {
      await execa(cmd, args, {
        cwd: REPO_ROOT,
        stdio: 'ignore',
      });
      return true;
    } catch (error) {
      continue;
    }
  }

  return false;
};

interface LocateRemoteArchiveDependencies {
  remoteExists: (uri: string) => Promise<boolean>;
  readCommitMetadata: (uri: string) => Promise<ArchiveMetadata | undefined>;
  readPullRequestMetadata: (uri: string) => Promise<PullRequestArchiveMetadata | undefined>;
  withAuth: <TReturn>(log: SomeDevLog, action: () => Promise<TReturn>) => Promise<TReturn>;
}

const defaultLocateRemoteArchiveDependencies: LocateRemoteArchiveDependencies = {
  remoteExists: remoteArchiveExists,
  readCommitMetadata: readRemoteArchiveMetadata,
  readPullRequestMetadata: readRemotePullRequestMetadata,
  withAuth: withGcsAuth,
};

interface RemoteCandidateDescriptor {
  sha: string;
  source: 'commit' | 'pull-request';
  metadata?: ArchiveMetadata;
}

export async function locateRemoteArchive(
  log: SomeDevLog,
  shas: string[],
  options: { prNumber?: string } = {},
  deps: LocateRemoteArchiveDependencies = defaultLocateRemoteArchiveDependencies
): Promise<ArchiveCandidate | undefined> {
  return await deps.withAuth(log, async () => {
    let prMetadata: PullRequestArchiveMetadata | undefined;

    if (options.prNumber) {
      const prUris = buildPullRequestRemoteUris(options.prNumber);
      const prArchiveExists = await deps.remoteExists(prUris.archiveUri);

      if (prArchiveExists) {
        prMetadata = await deps.readPullRequestMetadata(prUris.metadataUri);
        const latestCommit = prMetadata?.commits?.[0];

        if (latestCommit?.commitSha) {
          return {
            kind: 'remote',
            remotePath: prUris.archiveUri,
            sha: latestCommit.commitSha,
            source: 'pull-request',
            metadata: latestCommit,
          };
        }
      } else {
        prMetadata = await deps.readPullRequestMetadata(prUris.metadataUri);
      }
    }

    const descriptors: RemoteCandidateDescriptor[] = [];

    if (options.prNumber && prMetadata) {
      for (const commit of prMetadata.commits) {
        if (!commit.commitSha) {
          continue;
        }

        descriptors.push({ sha: commit.commitSha, source: 'pull-request', metadata: commit });
      }
    }

    for (const sha of shas) {
      descriptors.push({ sha, source: 'commit' });
    }

    const visited = new Set<string>();

    for (const descriptor of descriptors) {
      if (!descriptor.sha || visited.has(descriptor.sha)) {
        continue;
      }

      visited.add(descriptor.sha);

      const commitUris = buildCommitRemoteUris(descriptor.sha);
      if (!(await deps.remoteExists(commitUris.archiveUri))) {
        continue;
      }

      const metadata =
        descriptor.metadata ?? (await deps.readCommitMetadata(commitUris.metadataUri));

      return {
        kind: 'remote',
        remotePath: commitUris.archiveUri,
        sha: descriptor.sha,
        source: descriptor.source,
        metadata,
      };
    }

    return undefined;
  });
}

export async function cleanTypeCheckArtifacts(log: SomeDevLog) {
  const directoryMatches = await globby(TYPES_DIRECTORY_GLOB, {
    cwd: REPO_ROOT,
    absolute: true,
    onlyDirectories: true,
    followSymbolicLinks: false,
    ignore: CACHE_IGNORE_GLOBS,
  });
  const directoryPaths: string[] = Array.from(new Set<string>(directoryMatches));

  const configMatches = await globby(TYPE_CHECK_CONFIG_GLOB, {
    cwd: REPO_ROOT,
    absolute: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: CACHE_IGNORE_GLOBS,
  });
  const configPaths: string[] = Array.from(new Set<string>(configMatches));

  await asyncForEachWithLimit(directoryPaths, 10, async (directoryPath) => {
    await Fs.promises.rm(directoryPath, { recursive: true, force: true });
  });

  await asyncForEachWithLimit(configPaths, 25, async (configPath) => {
    await Fs.promises.rm(configPath, { force: true });
  });

  if (directoryPaths.length > 0 || configPaths.length > 0) {
    log.info(
      `Cleared ${directoryPaths.length} type cache directories and ${configPaths.length} config files before restore.`
    );
  }
}

export const getTarCreateArgs = (fileArg: string, fileListPath: string): string[] => [
  '--create',
  '--file',
  fileArg,
  '--gzip',
  '--directory',
  REPO_ROOT,
  '--null',
  '--files-from',
  fileListPath,
];

export const resolveTarEnvironment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // these should speed up archiving on MacOS
    COPYFILE_DISABLE: '1',
    COPY_EXTENDED_ATTRIBUTES_DISABLE: '1',
  };

  env.GZIP = `-1`;

  return env;
};
