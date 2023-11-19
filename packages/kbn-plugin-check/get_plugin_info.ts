/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ClassDeclaration, MethodDeclaration, Project, SyntaxKind, TypeNode } from 'ts-morph';

import { PluginOrPackage } from '@kbn/docs-utils/src/types';
import { ToolingLog } from '@kbn/tooling-log';

import { getPluginClasses } from './get_plugin_classes';
import { PluginInfo, PluginLifecycle, PluginLayer, Lifecycle, Dependencies } from './types';

export const getPluginInfo = (
  project: Project,
  plugin: PluginOrPackage,
  log: ToolingLog
): PluginInfo | null => {
  const { manifest } = plugin;

  const optionalManifestPlugins = manifest.optionalPlugins || [];
  const requiredManifestPlugins = manifest.requiredPlugins || [];
  const requiredManifestBundles = manifest.requiredBundles || [];

  const { client, server } = getPluginClasses(project, plugin, log);

  const clientDependencies = getPluginDependencies(client, 'client', log);
  const serverDependencies = getPluginDependencies(server, 'server', log);

  const allPluginDependencies = [
    ...new Set([...clientDependencies.all, ...serverDependencies.all]),
  ];

  const allManifestDependencies = [
    ...new Set([
      ...requiredManifestPlugins,
      ...optionalManifestPlugins,
      ...requiredManifestBundles,
    ]),
  ];

  return {
    name: plugin.id,
    project,
    classes: {
      client,
      server,
    },
    dependencies: {
      all: [...new Set([...allManifestDependencies, ...allPluginDependencies])],
      manifest: {
        all: allManifestDependencies,
        required: requiredManifestPlugins,
        optional: optionalManifestPlugins,
        bundle: requiredManifestBundles,
      },
      plugin: {
        all: allPluginDependencies,
        client: clientDependencies,
        server: serverDependencies,
      },
    },
  };
};

const getPluginDependencies = (
  pluginClass: ClassDeclaration | null,
  pluginType: 'client' | 'server',
  log: ToolingLog
): Lifecycle => {
  if (!pluginClass) {
    return {
      all: [],
      setup: null,
      start: null,
    };
  }

  const {
    source: setupSource,
    typeName: setupType,
    optional: optionalSetupDependencies,
    required: requiredSetupDependencies,
  } = getDependenciesFromLifecycleType(pluginClass, 'setup', pluginType, log);

  const {
    source: startSource,
    typeName: startType,
    optional: optionalStartDependencies,
    required: requiredStartDependencies,
  } = getDependenciesFromLifecycleType(pluginClass, 'start', pluginType, log);

  return {
    all: [
      ...new Set([
        ...requiredSetupDependencies,
        ...optionalSetupDependencies,
        ...requiredStartDependencies,
        ...optionalStartDependencies,
      ]),
    ],
    setup: {
      all: [...new Set([...requiredSetupDependencies, ...optionalSetupDependencies])],
      source: setupSource,
      typeName: setupType,
      required: requiredSetupDependencies,
      optional: optionalSetupDependencies,
    },
    start: {
      all: [...new Set([...requiredStartDependencies, ...optionalStartDependencies])],
      source: startSource,
      typeName: startType,
      required: requiredStartDependencies,
      optional: optionalStartDependencies,
    },
    // type: {
    //   setup: {
    //     source: setupSource,
    //     name: setupType,
    //   },
    //   start: {
    //     source: startSource,
    //     name: startType,
    //   },
    // },
    // required: {
    //   all: [...new Set([...requiredSetupDependencies, ...requiredStartDependencies])],
    //   setup: requiredSetupDependencies,
    //   start: requiredStartDependencies,
    // },
    // optional: {
    //   all: [...new Set([...optionalSetupDependencies, ...optionalStartDependencies])],
    //   setup: optionalSetupDependencies,
    //   start: optionalStartDependencies,
    // },
  };
};

const getDependenciesFromLifecycleType = (
  pluginClass: ClassDeclaration,
  lifecycle: PluginLifecycle,
  layer: PluginLayer,
  log: ToolingLog
): Dependencies => {
  const className = pluginClass.getName();
  log.debug(`${layer}/${className}/${lifecycle} discovering dependencies.`);

  const classImplements = pluginClass.getImplements();

  if (!classImplements || classImplements.length === 0) {
    log.warning(`${layer}/${className} plugin class does not extend the Core Plugin interface.`);
  } else {
    // This is safe, as we don't allow more than one class per file.
    const typeArguments = classImplements[0].getTypeArguments();

    const node = typeArguments[lifecycle === 'setup' ? 2 : 3];

    if (node) {
      const dependencies = getDependenciesFromNode(node, log);

      if (dependencies) {
        return dependencies;
      }
    } else {
      log.warning(
        `${layer}/${className}/${lifecycle} dependencies not defined on core interface generic.`
      );
    }
  }

  log.debug(
    `${layer}/${className}/${lifecycle} falling back to instance method to derive dependencies.`
  );

  const methods = pluginClass.getInstanceMethods();
  const method = methods.find((m) => m.getName() === (lifecycle === 'setup' ? 'setup' : 'start'));

  if (!method) {
    throw new Error(
      `${layer}/${className}/${lifecycle} method does not exist; this should not be possible.`
    );
  }

  const dependencies = getDependenciesFromMethod(method, log);

  if (dependencies) {
    return dependencies;
  }

  log.warning(
    `${layer}/${className}/${lifecycle} dependencies also not defined on lifecycle method.`
  );

  return {
    all: [],
    source: 'none',
    typeName: null,
    required: [],
    optional: [],
  };
};

const getDependenciesFromNode = (
  node: TypeNode | undefined,
  _log: ToolingLog
): Dependencies | null => {
  if (!node) {
    return null;
  }

  const typeName = node.getText();

  const dependencies = node
    .getType()
    .getSymbol()
    ?.getMembers()
    .map((member) => {
      return { name: member.getName(), isOptional: member.isOptional() };
    });

  const optional =
    dependencies
      ?.filter((dependency) => dependency.isOptional)
      .map((dependency) => dependency.name) || [];

  const required =
    dependencies
      ?.filter((dependency) => !dependency.isOptional)
      .map((dependency) => dependency.name) || [];

  return {
    all: [...new Set([...required, ...optional])],
    source: 'implements',
    typeName,
    required,
    optional,
  };
};

const getDependenciesFromMethod = (
  method: MethodDeclaration,
  _log: ToolingLog
): Dependencies | null => {
  if (!method) {
    return null;
  }

  const dependencyObj = method.getParameters()[1];

  if (!dependencyObj) {
    return null;
  }

  const typeRef = dependencyObj.getDescendantsOfKind(SyntaxKind.TypeReference)[0];

  if (!typeRef) {
    return null;
  }

  const symbol = typeRef.getType().getSymbol();

  const dependencies = symbol?.getMembers().map((member) => {
    return { name: member.getName(), isOptional: member.isOptional() };
  });

  const optional =
    dependencies
      ?.filter((dependency) => dependency.isOptional)
      .map((dependency) => dependency.name) || [];

  const required =
    dependencies
      ?.filter((dependency) => !dependency.isOptional)
      .map((dependency) => dependency.name) || [];

  return {
    all: [...new Set([...required, ...optional])],
    source: 'method',
    typeName: symbol?.getName() || null,
    required,
    optional,
  };
};
