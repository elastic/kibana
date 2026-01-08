/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from "@kbn/utility-types";

export function embeddableTelemetry(
  state: SerializableRecord,
  telemetryData: Record<string, any> = {}) {
    let outputTelemetryData = telemetryData;

    /*Object.keys(enhancements).map((key) => {
      if (!enhancements[key]) return;
      outputTelemetryData = getEnhancement(key).telemetry(
        enhancements[key] as Record<string, SerializableRecord>,
        outputTelemetryData
      );
    });*/

    return outputTelemetryData;
}