/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface TemplateContext {
  artifactPrefix: string;
  artifactTarball: string;
  branch: string;
  imageFlavor: string;
  version: string;
  license: string;
  artifactsDir: string;
  dockerPush: boolean;
  dockerTag: string | null;
  dockerTagQualifier: string | null;
  dockerCrossCompile: boolean;
  imageTag: string;
  dockerBuildDir: string;
  dockerTargetFilename: string;
  dockerBuildDate: string;
  usePublicArtifact?: boolean;
  publicArtifactSubdomain: string;
  baseImage: 'none' | 'ubi' | 'ubuntu' | 'wolfi';
  baseImageName: string;
  cloud?: boolean;
  serverless?: boolean;
  metricbeatTarball?: string;
  filebeatTarball?: string;
  ironbank?: boolean;
  revision: string;
  architecture?: string;
  fips?: boolean;
}
