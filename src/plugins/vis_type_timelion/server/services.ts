/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginStart } from '../../data/server';

let indexPatternsServiceFactory: PluginStart['indexPatterns']['indexPatternsServiceFactory'];

export const setIndexPatternsService = async (indexPatterns: PluginStart['indexPatterns']) => {
  indexPatternsServiceFactory = indexPatterns.indexPatternsServiceFactory;
};

export const getIndexPatternsService = () => indexPatternsServiceFactory;
