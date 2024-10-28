/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ClassDeclaration, MethodDeclaration, Project, SyntaxKind, TypeNode } from 'ts-morph';

import { PluginOrPackage } from '@kbn/docs-utils/src/types';
import { ToolingLog } from '@kbn/tooling-log';

import { getPluginClasses } from '../lib/get_plugin_classes';
import { PluginInfo, PluginLifecycle, PluginLayer, Lifecycle, Dependencies } from '../types';

/**
 * Derive and return information about a plugin and its dependencies.
 */
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

  // Combine all plugin implementation dependencies, removing duplicates.
  const allPluginDependencies = [
    ...new Set([...clientDependencies.all, ...serverDependencies.all]),
  ];

  // Combine all manifest dependencies, removing duplicates.
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
  // If the plugin class doesn't exist, return an empty object with `null` implementations.
  if (!pluginClass) {
    return {
      all: [],
      setup: null,
      start: null,
    };
  }

  // This is all very brute-force, but it's easier to see and understand what's going on, rather
  // than relying on loops and placeholders.  YMMV.
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
  };
};

/**
 * Given a lifecycle type, derive the dependencies for that lifecycle.
 */
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

    // The `Plugin` generic has 4 type arguments, the 3rd of which is an interface of `setup`
    // dependencies, and the fourth being an interface of `start` dependencies.
    const type = typeArguments[lifecycle === 'setup' ? 2 : 3];

    // If the type is defined, we can derive the dependencies directly from it.
    if (type) {
      const dependencies = getDependenciesFromNode(type, log);

      if (dependencies) {
        return dependencies;
      }
    } else {
      // ...and we can warn if the type is not defined.
      log.warning(
        `${layer}/${className}/${lifecycle} dependencies not defined on core interface generic.`
      );
    }
  }

  // If the type is not defined or otherwise unavailable, it's possible to derive the lifecycle
  // dependencies directly from the instance method.
  log.debug(
    `${layer}/${className}/${lifecycle} falling back to instance method to derive dependencies.`
  );

  const methods = pluginClass.getInstanceMethods();

  // Find the method on the class that matches the lifecycle name.
  const method = methods.find((m) => m.getName() === (lifecycle === 'setup' ? 'setup' : 'start'));

  // As of now, a plugin cannot omit a lifecycle method, so throw an error.
  if (!method) {
    throw new Error(
      `${layer}/${className}/${lifecycle} method does not exist; this should not be possible.`
    );
  }

  // Given a method, derive the dependencies.
  const dependencies = getDependenciesFromMethod(method, log);

  if (dependencies) {
    return dependencies;
  }

  log.warning(
    `${layer}/${className}/${lifecycle} dependencies also not defined on lifecycle method.`
  );

  // At this point, there's no way to derive the dependencies, so return an empty object.
  return {
    all: [],
    source: 'none',
    typeName: null,
    required: [],
    optional: [],
  };
};

/** Derive dependencies from a `TypeNode`-- the lifecycle method itself. */
const getDependenciesFromNode = (
  node: TypeNode | undefined,
  _log: ToolingLog
): Dependencies | null => {
  if (!node) {
    return null;
  }

  const typeName = node.getText();

  // Get all of the dependencies and whether or not they're required.
  const dependencies = node
    .getType()
    .getSymbol()
    ?.getMembers()
    .map((member) => {
      return { name: member.getName(), isOptional: member.isOptional() };
    });

  // Split the dependencies into required and optional.
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
    // Set the `source` to `implements`, as the dependencies were derived from the method
    // implementation, rather than an explicit type.
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
