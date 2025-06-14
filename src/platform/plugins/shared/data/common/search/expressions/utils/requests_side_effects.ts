/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Adapters } from '@kbn/inspector-plugin/common';

const collectSideEffectsData = (adapters: Adapters) => {
  return adapters.requests?.getRequestEntries();
};

export const getSideEffectFunction = (adapters: Adapters) => {
  const requestsWithResponses = collectSideEffectsData(adapters);
  return () => {
    if (!requestsWithResponses || requestsWithResponses.length === 0) {
      return;
    }
    const requestsMap = new Map(requestsWithResponses.map(([request]) => [request.id, request]));
    const responsesMap = new WeakMap(requestsWithResponses);
    adapters.requests?.loadFromEntries(requestsMap, responsesMap);
  };
};
