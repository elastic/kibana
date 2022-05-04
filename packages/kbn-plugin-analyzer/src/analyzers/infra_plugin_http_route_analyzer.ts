/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Project, Node, Type } from 'ts-morph';
import { Analyzer } from './types';

export const infraPluginHttpRouteAnalyzer: Analyzer = {
  name: 'InfraPluginHttpRouteAnalyzer',
  async apply(pluginProject) {
    const serverDirectory = getScopeDirectory(pluginProject, 'server');
    const serverIndexFile = serverDirectory.getSourceFileOrThrow('index.ts');
    const pluginFactory = serverIndexFile.getExportedDeclarations().get('plugin')?.[0];

    if (Node.isFunctionLikeDeclaration(pluginFactory)) {
      const pluginClassType = pluginFactory.getReturnType();
      const pluginClass = pluginClassType.getSymbol()?.getDeclarations()[0];
      const pluginClassFile = pluginClass?.getSourceFile();
      console.log(pluginClassFile?.getReferencedSourceFiles());
    }
    // console.log(serverIndexFile.getExportDeclarations());
    // const serverPluginEntrypoint = pluginProject.getSourceFileOrThrow('server/index.ts');
    // const sourceFiles = pluginProject.getSourceFiles(
    //   'x-pack/plugins/infra/server/routes/**/index.ts'
    // );
    // eslint-disable-next-line no-console
    // console.log(serverPluginEntrypoint);
    return {
      features: [],
      errors: [],
    };
  },
};

function getScopeDirectory(pluginProject: Project, apiScope: 'common' | 'public' | 'server') {
  const scopeDirectory = pluginProject
    .getRootDirectories()
    .find((rootDirectory) => rootDirectory.getBaseName() === apiScope);

  if (scopeDirectory == null) {
    throw new Error(`Failed to find the directory for scope ${apiScope}`);
  }

  return scopeDirectory;
}
