/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const createWorkersRegistry = (defaultWorkerId: string) => {
  const registry = new Map<string, () => Promise<any>>();

  return {
    register: (languageId: string, getWorkerSrc: () => Promise<any>) => {
      registry.set(languageId, getWorkerSrc);
    },

    getWorker: async (module: string, languageId: string) => {
      const getWorkerSrc = registry.get(languageId) || registry.get(defaultWorkerId);
      if (getWorkerSrc) {
        const src = await getWorkerSrc();

        const blob = new Blob([src.default], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
      } else {
        throw new Error(`Worker for ${languageId} is not registered`);
      }
    },
  };
};

export type WorkersRegistry = ReturnType<typeof createWorkersRegistry>;
