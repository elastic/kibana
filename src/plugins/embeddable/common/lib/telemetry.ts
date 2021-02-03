/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CommonEmbeddableStartContract, EmbeddableStateWithType } from '../types';
import { telemetryBaseEmbeddableInput } from './migrate_base_input';

export const getTelemetryFunction = (embeddables: CommonEmbeddableStartContract) => {
  return (state: EmbeddableStateWithType, telemetryData: Record<string, any> = {}) => {
    const enhancements: Record<string, any> = state.enhancements || {};
    const factory = embeddables.getEmbeddableFactory(state.type);

    let outputTelemetryData = telemetryBaseEmbeddableInput(state, telemetryData);
    if (factory) {
      outputTelemetryData = factory.telemetry(state, outputTelemetryData);
    }
    Object.keys(enhancements).map((key) => {
      if (!enhancements[key]) return;
      outputTelemetryData = embeddables
        .getEnhancement(key)
        .telemetry(enhancements[key], outputTelemetryData);
    });

    return outputTelemetryData;
  };
};
