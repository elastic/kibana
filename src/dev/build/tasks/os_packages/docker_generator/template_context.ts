/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  dockerTagQualifier: string | null;
  imageTag: string;
  dockerBuildDir: string;
  dockerTargetFilename: string;
  baseOSImage: string;
  dockerBuildDate: string;
  usePublicArtifact?: boolean;
  publicArtifactSubdomain: string;
  ubi?: boolean;
  ubuntu?: boolean;
  cloud?: boolean;
  metricbeatTarball?: string;
  filebeatTarball?: string;
  ironbank?: boolean;
  revision: string;
  architecture?: string;
}
