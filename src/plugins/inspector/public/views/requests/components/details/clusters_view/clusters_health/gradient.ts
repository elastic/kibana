/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const HEALTH_HEX_CODES = {
  successful: '#54B399',
  partial: '#D6BF57',
  skipped: '#DA8B45',
  failed: '#E7664C',
};

export function getHeathBarLinearGradient(
  successful: number,
  partial: number,
  skipped: number,
  failed: number
) {
  const total = successful + partial + skipped + failed;
  const stops: string[] = [];
  let startPercent: number = 0;

  function addStop(value: number, color: string) {
    if (value <= 0) {
      return;
    }

    const percent = Math.round((value / total) * 100);
    const endPercent = startPercent + percent;
    stops.push(`${color} ${startPercent}% ${endPercent}%`);
    startPercent = endPercent;
  }

  addStop(successful, HEALTH_HEX_CODES.successful);
  addStop(partial, HEALTH_HEX_CODES.partial);
  addStop(skipped, HEALTH_HEX_CODES.skipped);
  addStop(failed, HEALTH_HEX_CODES.failed);

  const printedStops = stops
    .map((stop, index) => {
      return index === stops.length - 1 ? stop : stop + ', ';
    })
    .join('');

  return `linear-gradient(to right, ${printedStops})`;
}
