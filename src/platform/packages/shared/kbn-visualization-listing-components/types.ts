/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Release stage of a visualization type
 */
export type VisualizationStage = 'experimental' | 'beta' | 'production';

/**
 * Represents a visualization item in the listing table
 */
export interface VisualizationListItem {
  /** Optional error message if the visualization failed to load */
  error?: string;
  /** Icon identifier for the visualization type */
  icon?: string;
  /** Image URL for custom visualization type icons */
  image?: string;
  /** Release stage of the visualization type */
  stage?: VisualizationStage;
  /** Display name of the visualization type */
  typeTitle?: string;
}
