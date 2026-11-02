/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { remoteTokenId, type RemoteModule, type RemoteWorkerSpec } from '@kbn/core-remote-common';
import type { RemoteRegistration } from '@kbn/core-remote-server';

export function buildRemoteSpec(
  modules: readonly RemoteModule[],
  registration: RemoteRegistration
): RemoteWorkerSpec {
  const kindIds = new Set(registration.contributions.map((kind) => remoteTokenId(kind)));
  const rootId = remoteTokenId(registration.root);
  const dependencyIds = new Set(
    (registration.dependencies ?? []).map((token) => remoteTokenId(token))
  );
  let root: RemoteWorkerSpec['root'] | undefined;
  let catalog: RemoteWorkerSpec['catalog'];
  const executorProviders: RemoteWorkerSpec['executorProviders'][number][] = [];
  const contributions: RemoteWorkerSpec['contributions'][number][] = [];
  const coordinatorTokenIds: string[] = [];

  const relevant = modules.filter((remoteModule) => {
    const selectedProvider = (remoteModule.providers ?? []).some((provider) => {
      const id = remoteTokenId(provider.token);
      return id === rootId || dependencyIds.has(id);
    });
    const selectedContribution = (remoteModule.contributions ?? []).some((contribution) =>
      kindIds.has(remoteTokenId(contribution.kind))
    );
    return selectedProvider || selectedContribution;
  });

  for (const remoteModule of relevant) {
    for (const provider of remoteModule.providers ?? []) {
      const id = remoteTokenId(provider.token);
      if (provider.role === 'root') {
        if (id !== rootId) continue;
        if (root) {
          throw new Error(`Remote graph "${registration.id}" has more than one root provider`);
        }
        root = { tokenId: id, modulePath: provider.modulePath, exportName: provider.exportName };
        continue;
      }
      if (provider.placement === 'coordinator') {
        if (!coordinatorTokenIds.includes(id)) coordinatorTokenIds.push(id);
        continue;
      }
      if (provider.role === 'catalog') {
        if (!dependencyIds.has(id)) continue;
        if (catalog) {
          throw new Error(
            `Remote graph "${registration.id}" has more than one catalogue provider`
          );
        }
        catalog = {
          tokenId: id,
          modulePath: provider.modulePath,
          exportName: provider.exportName,
        };
        continue;
      }
      executorProviders.push({
        tokenId: id,
        modulePath: provider.modulePath,
        exportName: provider.exportName,
      });
    }
    for (const contribution of remoteModule.contributions ?? []) {
      if (!kindIds.has(remoteTokenId(contribution.kind))) continue;
      contributions.push({
        stepType: contribution.stepType,
        modulePath: contribution.modulePath,
        exportName: contribution.exportName,
      });
    }
  }

  for (const id of dependencyIds) {
    const provided =
      catalog?.tokenId === id ||
      coordinatorTokenIds.includes(id) ||
      executorProviders.some((provider) => provider.tokenId === id);
    if (!provided) {
      throw new Error(`Remote graph "${registration.id}" is missing dependency "${id}"`);
    }
  }

  if (!root) {
    throw new Error(`Remote graph "${registration.id}" has no executor provider for its root`);
  }
  return {
    id: registration.id,
    root,
    catalog,
    executorProviders,
    contributions,
    coordinatorTokenIds,
  };
}
