/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';

export function useHealthHexCodes() {
  const { euiTheme } = useEuiTheme();
  return {
    successful: euiTheme.colors.backgroundFilledSuccess,
    partial: euiTheme.colors.backgroundLightWarning,
    skipped: euiTheme.colors.backgroundFilledWarning,
    failed: euiTheme.colors.backgroundFilledDanger,
  };
}

export function useHeathBarLinearGradient(
  successful: number,
  partial: number,
  skipped: number,
  failed: number
) {
  const healthHexCodes = useHealthHexCodes();

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

  addStop(successful, healthHexCodes.successful);
  addStop(partial, healthHexCodes.partial);
  addStop(skipped, healthHexCodes.skipped);
  addStop(failed, healthHexCodes.failed);

  const printedStops = stops
    .map((stop, index) => {
      return index === stops.length - 1 ? stop : stop + ', ';
    })
    .join('');

  return `linear-gradient(to right, ${printedStops})`;
}
