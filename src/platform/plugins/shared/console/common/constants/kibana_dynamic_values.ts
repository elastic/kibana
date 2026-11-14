/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Kibana API path params whose valid values live in the cluster (for example a space id).
// The generated definitions mark these params with `toKibanaDynamicValueMarker(source)` and
// Console resolves the marker to the values returned by the matching Kibana API.
export const KIBANA_DYNAMIC_VALUE_SOURCES = ['space', 'connector', 'data_view', 'rule'] as const;

export type KibanaDynamicValueSource = (typeof KIBANA_DYNAMIC_VALUE_SOURCES)[number];

const KIBANA_DYNAMIC_VALUE_PREFIX = '__kibana_';

export const toKibanaDynamicValueMarker = (source: KibanaDynamicValueSource): string =>
  `${KIBANA_DYNAMIC_VALUE_PREFIX}${source}`;

export const fromKibanaDynamicValueMarker = (
  marker: string
): KibanaDynamicValueSource | undefined =>
  KIBANA_DYNAMIC_VALUE_SOURCES.find((source) => toKibanaDynamicValueMarker(source) === marker);
