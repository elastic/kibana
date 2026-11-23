/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

export interface DiscoveredEisModel {
  inferenceId: string;
  modelId: string;
  metadata?: {
    heuristics?: {
      properties?: string[];
    };
  };
}

const EIS_MODELS_PATH = resolve(REPO_ROOT, 'target/eis_models.json');

const readDiscoveredEisModels = (): DiscoveredEisModel[] => {
  try {
    const { models }: { models?: DiscoveredEisModel[] } = JSON.parse(
      readFileSync(EIS_MODELS_PATH, 'utf8')
    );
    return models ?? [];
  } catch {
    return [];
  }
};

/**
 * Discovered EIS models tagged `kibana-connector`, excluding `efficient` and `ocr-only`.
 * Returns [] when the artifact is missing; throws when it lists models but none qualify.
 */
export const getEisConnectorModels = (): DiscoveredEisModel[] => {
  const discovered = readDiscoveredEisModels();

  const eligible = discovered.filter(({ metadata }) => {
    const properties = metadata?.heuristics?.properties ?? [];
    return (
      properties.includes('kibana-connector') &&
      !properties.includes('efficient') &&
      !properties.includes('ocr-only')
    );
  });

  if (discovered.length > 0 && eligible.length === 0) {
    throw new Error(
      `None of the ${discovered.length} EIS models in ${EIS_MODELS_PATH} are tagged "kibana-connector"`
    );
  }

  return eligible;
};
