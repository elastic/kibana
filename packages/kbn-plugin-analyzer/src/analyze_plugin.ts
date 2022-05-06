/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Project } from 'ts-morph';
import { infraPluginHttpRouteAnalyzer } from './analyzers/infra_plugin_http_route_analyzer';
import { Analyzer } from './analyzers/types';
import { formatFeature } from './features';

export async function analyzePlugin(pluginTsconfigPath: string) {
  // eslint-disable-next-line no-console
  console.log('Loading project...');
  const pluginProject = createPluginProject(pluginTsconfigPath);

  // eslint-disable-next-line no-console
  console.log('Analyzing plugin...');
  const analysisResults = await Promise.all(
    analyzers.map((analyzer) => analyzer.apply(pluginProject))
  );

  console.log('\n# Detected features');
  console.log(analysisResults.flatMap((result) => result.features.map(formatFeature)).join('\n\n'));

  console.log('\n# Errors');
  console.log(analysisResults.flatMap((result) => result.errors));
}

function createPluginProject(pluginTsconfigPath: string) {
  const project = new Project({
    tsConfigFilePath: pluginTsconfigPath,
    skipLoadingLibFiles: true,
    skipAddingFilesFromTsConfig: true,
  });

  // project.enableLogging();
  project.addSourceFilesFromTsConfig(pluginTsconfigPath);
  project.resolveSourceFileDependencies();

  return project;
}

const analyzers: Analyzer[] = [infraPluginHttpRouteAnalyzer];
