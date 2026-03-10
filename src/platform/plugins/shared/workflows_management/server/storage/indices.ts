/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Prefix of the workflows system indices.
 *
 * The Kibana system user has the same permission on those indices than it has on Kibana system indices.
 */
export const workflowSystemIndexPrefix = '.workflows-';

/**
 * Helper function to define workflow system indices.
 */
export const workflowSystemIndex = (suffix: string): string => {
  return `${workflowSystemIndexPrefix}${suffix}`;
};
