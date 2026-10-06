/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Checks for the compatibilitiy between Elasticsearch and Kibana versions
 * 1. Major version differences will never work together.
 * 2. Older versions of ES won't work with newer versions of Kibana.
 */
export declare function esVersionCompatibleWithKibana(
  esVersion: string,
  kibanaVersion: string
): boolean;
export declare function esVersionEqualsKibana(
  nodeVersion: string,
  kibanaVersion: string
): boolean | null;
