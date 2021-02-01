/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface TemplateContext {
  artifactPrefix: string;
  artifactTarball: string;
  branch: string;
  imageFlavor: string;
  version: string;
  license: string;
  artifactsDir: string;
  imageTag: string;
  dockerBuildDir: string;
  dockerTargetFilename: string;
  baseOSImage: string;
  dockerBuildDate: string;
  usePublicArtifact?: boolean;
  ubi?: boolean;
  ironbank?: boolean;
  revision: string;
  architecture?: string;
}
