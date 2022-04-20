/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { WithLayerId } from '../types';

function isWithLayerId<T>(layer: T): layer is T & WithLayerId {
  return (layer as T & WithLayerId).layerId ? true : false;
}

export const generateLayerId = (keyword: string, index: number) => `${keyword}-${index}`;

export function appendLayerIds<T>(
  layers: Array<T | undefined>,
  keyword: string
): Array<T & WithLayerId> {
  return layers
    .filter((l): l is T => l !== undefined)
    .map((l, index) => ({
      ...l,
      layerId: isWithLayerId(l) ? l.layerId : generateLayerId(keyword, index),
    }));
}
