/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { EsClusterExecOptions } from '../cluster_exec_options';
interface ImageOptions {
  image?: string;
  tag?: string;
}
interface BaseOptions extends ImageOptions {
  port?: number;
  ssl?: boolean;
  /** Kill running cluster before starting a new cluster  */
  kill?: boolean;
  files?: string | string[];
}
export declare const serverlessProjectTypes: readonly [
  'es',
  'oblt',
  'security',
  'workplaceai',
  'vectordb'
];
export type ServerlessProjectType = (typeof serverlessProjectTypes)[number];
export declare const esServerlessProjectTypes: readonly [
  'elasticsearch',
  'elasticsearch_general_purpose',
  'elasticsearch_vector',
  'observability',
  'security',
  'workplaceai',
  'vectordb'
];
export type EsServerlessProjectType = (typeof esServerlessProjectTypes)[number];
export declare const serverlessProductTiers: readonly [
  'essentials',
  'logs_essentials',
  'complete',
  'search_ai_lake'
];
export type ServerlessProductTier = (typeof serverlessProductTiers)[number];
export declare const isServerlessProjectType: (value: string) => value is ServerlessProjectType;
export declare const isEsServerlessProjectType: (value: string) => value is EsServerlessProjectType;
export declare const isServerlessProjectTier: (value: string) => value is ServerlessProductTier;
export declare const esProjectTypeFromKbn: Map<string, string>;
export declare const esSettingsProjectTypeFromKbn: Map<string, string>;
export declare const kbnProjectTypeFromEs: Map<string, string>;
export interface DockerOptions extends EsClusterExecOptions, BaseOptions {
  dockerCmd?: string;
  /** Activate snapshot-docker behavior (security, readiness check, detached mode, etc.) */
  snapshot?: boolean;
  license?: string;
  version?: string;
  /** Container name. Defaults to 'es01'. Use unique names for parallel runs. */
  name?: string;
  /** When true, returns immediately after ES is ready instead of tailing logs. */
  background?: boolean;
  /** Host-side transport port to map to container port 9300. Defaults to port + 100. */
  transportPort?: number;
}
export interface ServerlessOptions extends EsClusterExecOptions, BaseOptions {
  /** Publish ES docker container on additional host IP */
  host?: string;
  /** Serverless project type */
  projectType: ServerlessProjectType;
  /** Elasticsearch serverless project type */
  esProjectType?: EsServerlessProjectType;
  /** Product tier for serverless project */
  productTier?: ServerlessProductTier;
  /** Clean (or delete) all data created by the ES cluster after it is stopped */
  clean?: boolean;
  /** Full path where the ES cluster will store data */
  basePath: string;
  /** Directory in basePath where the ES cluster will store data */
  dataPath?: string;
  /** If this process exits, leave the ES cluster running in the background */
  skipTeardown?: boolean;
  /** Start the ES cluster in the background instead of remaining attached: useful for running tests */
  background?: boolean;
  /** Wait for the ES cluster to be ready to serve requests */
  waitForReady?: boolean;
  /**
   * Resource file(s) to overwrite
   * (see list of files that can be overwritten under `src/platform/packages/shared/kbn-es/src/serverless_resources/users`)
   */
  resources?: string | string[];
  /** Configure ES serverless with UIAM support */
  uiam?: boolean;
  /** Configure ES serverless with UIAM OAuth support (starts an additional uiam-oauth container) */
  uiamOAuth?: boolean;
  /** Configuration for a linked project in Cross Project Search (CPS) mode */
  linkedProject?: {
    projectId: string;
    port: number;
  };
}
interface ServerlessEsNodeArgs {
  esArgs?: Array<[string, string]>;
  image: string;
  name: string;
  params: string[];
}
export declare const DEFAULT_PORT = 9200;
export declare const DOCKER_REPO = 'docker.elastic.co/elasticsearch/elasticsearch';
export declare const DOCKER_TAG: string;
export declare const DOCKER_IMG: string;
export declare const ES_SERVERLESS_REPO_KIBANA =
  'docker.elastic.co/kibana-ci/elasticsearch-serverless';
export declare const ES_SERVERLESS_REPO_ELASTICSEARCH =
  'docker.elastic.co/elasticsearch-ci/elasticsearch-serverless';
export declare const ES_SERVERLESS_LATEST_VERIFIED_TAG = 'latest-verified';
export declare const ES_SERVERLESS_DEFAULT_IMAGE =
  'docker.elastic.co/kibana-ci/elasticsearch-serverless:latest-verified';
export declare function getSharedServerlessParams(nameSuffix?: string): string[];
export declare function getServerlessNodes(
  nameSuffix?: string,
  portOffset?: number
): Array<Omit<ServerlessEsNodeArgs, 'image'>>;
export declare const SERVERLESS_NODES: Omit<ServerlessEsNodeArgs, 'image'>[];
/**
 * Determine the Docker image from CLI options and defaults
 */
export declare function resolveDockerImage({
  tag,
  image,
  repo,
  defaultImg,
}: {
  tag?: string;
  image?: string;
  repo: string;
  defaultImg: string;
}): string;
/**
 * Determine the port and optionally an additional host to bind the Serverless index node or Docker node to
 */
export declare function resolvePort(options: ServerlessOptions | DockerOptions): string[];
/**
 * Verify that Docker is installed locally
 */
export declare function verifyDockerInstalled(log: ToolingLog): Promise<void>;
/**
 * Setup elastic Docker network if needed
 */
export declare function maybeCreateDockerNetwork(log: ToolingLog): Promise<void>;
/**
 * Pull a Docker image if needed. Ensures latest image.
 * Stops serverless from pulling the same image in each node's promise and
 * gives better control of log output, instead of falling back to docker run.
 */
export declare function maybePullDockerImage(log: ToolingLog, image: string): Promise<void>;
/**
 * When we're working with :latest or :latest-verified, it is useful to expand what version they refer to
 */
export declare function printDockerImageInfo(log: ToolingLog, image: string): Promise<void>;
export declare function cleanUpDanglingContainers(log: ToolingLog): Promise<void>;
export declare function detectRunningNodes(log: ToolingLog, options: BaseOptions): Promise<void>;
/**
 * Override default esArgs with options.esArgs
 */
export declare function resolveEsArgs(
  defaultEsArgs: Array<[string, string]>,
  options: ServerlessOptions | DockerOptions,
  projectIdOverride?: string
): string[];
export declare function getESp12Volume(): string[];
/**
 * Removes REPO_ROOT from hostPath. Keep the rest to avoid filename collisions.
 * Returns the path where a file will be mounted inside the ES or ES serverless container.
 * /root/kibana/package/foo/bar.json => /usr/share/elasticsearch/files/package/foo/bar.json
 */
export declare function getDockerFileMountPath(hostPath: string): string;
/**
 * Setup local volumes for Serverless ES
 */
export declare function setupServerlessVolumes(
  log: ToolingLog,
  options: ServerlessOptions,
  overrides?: {
    projectId?: string;
    operatorPath?: string;
  }
): Promise<string[]>;
/**
 * Run a single node in the ES Serverless cluster
 */
export declare function runServerlessEsNode(
  log: ToolingLog,
  { params, name, image }: ServerlessEsNodeArgs,
  sharedParams?: string[]
): Promise<void>;
/**
 * Runs an ES Serverless Cluster through Docker
 */
export declare function runServerlessCluster(
  log: ToolingLog,
  options: ServerlessOptions
): Promise<string[]>;
export declare const LINKED_CLUSTER_NAME_SUFFIX = '-linked';
export declare const LINKED_CLUSTER_PORT_OFFSET = 10;
/**
 * Starts a linked ES Serverless cluster for Cross Project Search (CPS).
 * Must be called AFTER the origin cluster and UIAM are fully ready.
 * Reuses the same Docker network, ES image, and UIAM service -- does NOT start new UIAM containers.
 */
export declare function runLinkedServerlessCluster(
  log: ToolingLog,
  options: ServerlessOptions
): Promise<string[]>;
/**
 * Stop a serverless ES cluster by node names
 */
export declare function stopServerlessCluster(log: ToolingLog, nodes: string[]): Promise<void>;
/**
 * Kill any serverless ES nodes and UIAM related containers which are running.
 */
export declare function teardownServerlessClusterSync(
  log: ToolingLog,
  options: ServerlessOptions
): void;
/**
 * Resolve the full command to run Elasticsearch Docker container
 */
export declare function resolveDockerCmd(options: DockerOptions, image?: string): string[];
/**
 * Runs an Elasticsearch Docker Container
 */
export declare function runDockerContainer(
  log: ToolingLog,
  options: DockerOptions
): Promise<string | void>;
export declare function stopDockerContainer(log: ToolingLog, containerName: string): Promise<void>;
export {};
