/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'cloudPipelines';
export const PLUGIN_NAME = 'Cloud Pipelines';

// API routes
export const API_BASE = '/api/cloud_pipelines';
export const API_PIPELINES = `${API_BASE}/pipelines`;
export const API_TENANT = `${API_BASE}/tenant`;

export type { PipelineListItem } from './types';
