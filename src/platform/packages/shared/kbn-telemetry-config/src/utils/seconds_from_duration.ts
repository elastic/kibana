/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const allowedUnits = ['us', 'ms', 's', 'm'];

/**
 * Ported over from the Elastic APM agent to provide backwards compatibility.
 * https://github.com/elastic/apm-agent-nodejs/blob/913c6da7cea3f35ef26d941fb5996fc8836ad9e1/lib/config/normalizers.js
 */
export function secondsFromDuration(duration: string): number {
  const regex = /^(\d+)(\w+)$/;
  const match = regex.exec(duration);
  if (!match) {
    throw new Error(`Duration "${duration}" does not match expected pattern "${String(regex)}"`);
  }

  let val = Number(match[1]);
  const unit = match[2];

  if (!allowedUnits.includes(unit)) {
    throw new Error(
      `Unit "${unit}" not in allowlist of ${allowedUnits.map((u) => `"${u}"`).join(', ')}`
    );
  }

  // Scale to seconds.
  switch (unit) {
    case 'us':
      val /= 1e6;
      break;
    case 'ms':
      val /= 1e3;
      break;
    case 's':
      break;
    case 'm':
      val *= 60;
      break;
    default:
      throw new Error(`unknown unit "${unit}" from "${duration}"`);
  }

  return val;
}
