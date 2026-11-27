/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';

export type IanaTimeZone = string & { readonly __ianaTimeZone: unique symbol };

/**
 * Brand a known IANA zone id.
 * @throws {Error} If `id` is empty, `Browser`, or not a known IANA zone.
 */
export const ianaTimeZone = (id: string): IanaTimeZone => {
  if (id === '' || id === 'Browser' || moment.tz.zone(id) == null) {
    throw new Error(`Invalid IANA time zone: ${id}`);
  }
  return id as IanaTimeZone;
};

/** Parse an untrusted zone id. Kibana's `Browser` sentinel becomes the local zone. Empty and unknown ids become UTC. */
export const ianaTimeZoneOrUtc = (id: string | undefined): IanaTimeZone => {
  const candidate = id === 'Browser' ? moment.tz.guess() : id;
  try {
    return ianaTimeZone(candidate ?? 'UTC');
  } catch {
    return ianaTimeZone('UTC');
  }
};
