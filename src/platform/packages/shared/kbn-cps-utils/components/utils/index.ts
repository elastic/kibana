/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CPSProject } from '../../types';

const PROJECT_TYPE_ICONS: Record<string, string> = {
  elasticsearch: 'logoElasticsearch',
  es: 'logoElasticsearch',
  security: 'logoSecurity',
  observability: 'logoObservability',
  vectordb: 'logoVectorDB',
} as const;

const CSP_LABELS: Record<string, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
} as const;

export const getCSPLabel = (csp: string): string => {
  return CSP_LABELS[csp] || csp.toUpperCase();
};

export const getSolutionIcon = (solution: string): string => {
  return PROJECT_TYPE_ICONS[solution] || 'empty';
};

export const getProjectTags = (project: CPSProject) =>
  Object.entries(project)
    .map(([key, value]) => {
      if (key.startsWith('_') || !value) {
        return null;
      }

      return {
        tagName: key,
        tagValue: value,
      };
    })
    .filter(
      (expression): expression is { tagName: string; tagValue: string } => expression !== null
    );
