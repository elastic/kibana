/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Project } from 'ts-morph';

export interface AnalysisError {
  message: string;
}

export interface AnalysisResult {
  features: PluginFeature[];
  errors: AnalysisError[];
}

export interface Analyzer {
  name: string;
  apply(pluginProject: Project): Promise<AnalysisResult>;
}

export type PluginFeature = GenericFeature | HttpRouteFeature;

export interface BaseFeature {
  sourceFilePath: string;
  lineNumber: number;
}

export interface GenericFeature extends BaseFeature {
  description: string;
}

export interface HttpRouteFeature extends BaseFeature {
  path: string;
}
