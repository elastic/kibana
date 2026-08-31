/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValueFormatConfig } from '@kbn/lens-common';
import type { LensApiMetricOperation } from '../../schema/metric_ops';
import {
  LENS_FORMAT_DURATION_COMPACT_DEFAULT,
  LENS_FORMAT_DURATION_DECIMALS_DEFAULT,
} from '../../schema/constants';
import { durationInputUnitCompat, durationOutputUnitCompat } from './duration_units';

/** Approximate duration output ignores decimals/compact (UI hides them; formatter does not use them). */
function isApproximateDurationApiTo(to: string): boolean {
  return to === 'auto-approximate';
}

export function fromFormatAPIToLensState(
  format: LensApiMetricOperation['format']
): ValueFormatConfig | undefined {
  if (!format) {
    return;
  }
  if (format.type === 'number' || format.type === 'percent') {
    return {
      id: format.type,
      params: {
        decimals: format.decimals,
        ...(format.suffix ? { suffix: format.suffix } : {}),
        ...(format.compact != null ? { compact: format.compact } : {}),
      },
    };
  }
  if (format.type === 'bits' || format.type === 'bytes') {
    return {
      id: format.type,
      params: {
        decimals: format.decimals,
        ...(format.suffix ? { suffix: format.suffix } : {}),
      },
    };
  }
  if (format.type === 'duration') {
    const toUnit = durationOutputUnitCompat.toState(format.to);
    // GA `auto-approximate` and legacy `humanize` both map to Lens `humanize`.
    const approximate = toUnit === 'humanize' || isApproximateDurationApiTo(format.to);
    // Legacy duration schema has no `decimals`/`compact`; narrow with `in` before reading.
    const decimals = 'decimals' in format ? format.decimals : undefined;
    const compact = 'compact' in format ? format.compact : undefined;
    const suffix = format.suffix ? { suffix: format.suffix } : {};
    const fromUnit = durationInputUnitCompat.toState(format.from);

    // Approximate: ignore input decimals/compact (not configurable). `decimals` is only
    // required by ValueFormatConfig; use the shared default. SO→API omits both.
    return {
      id: format.type,
      params: {
        decimals: approximate
          ? LENS_FORMAT_DURATION_DECIMALS_DEFAULT
          : decimals ?? LENS_FORMAT_DURATION_DECIMALS_DEFAULT,
        ...(!approximate ? { compact: compact ?? LENS_FORMAT_DURATION_COMPACT_DEFAULT } : {}),
        fromUnit,
        toUnit,
        ...suffix,
      },
    };
  }
  if (format.type === 'custom') {
    return {
      id: format.type,
      params: {
        // doesn't matter, it's will be ignored but want to make TS happy
        decimals: 0, // match runtime default
        pattern: format.pattern,
      },
    };
  }
}

export function fromFormatLensStateToAPI(
  format: ValueFormatConfig | undefined
): LensApiMetricOperation['format'] | undefined {
  if (!format) {
    return;
  }
  if (format.id === 'number' || format.id === 'percent') {
    return {
      type: format.id,
      ...(format.params?.decimals != null ? { decimals: format.params?.decimals } : {}),
      ...(format.params?.compact != null ? { compact: format.params?.compact } : {}),
      ...(format.params?.suffix ? { suffix: format.params.suffix } : {}),
    } as LensApiMetricOperation['format'];
  }
  if (format.id === 'bits' || format.id === 'bytes') {
    return {
      type: format.id,
      ...(format.params?.decimals != null ? { decimals: format.params?.decimals } : {}),
      ...(format.params?.suffix ? { suffix: format.params.suffix } : {}),
    } as LensApiMetricOperation['format'];
  }
  if (format.id === 'duration') {
    const to = durationOutputUnitCompat.toAPI(format.params?.toUnit);
    const approximate = isApproximateDurationApiTo(to);
    return {
      type: format.id,
      from: durationInputUnitCompat.toAPI(format.params?.fromUnit),
      to,
      // Approximate: omit decimals/compact — not configurable and ignored at render.
      ...(!approximate
        ? {
            decimals: format.params?.decimals ?? LENS_FORMAT_DURATION_DECIMALS_DEFAULT,
            compact: format.params?.compact ?? LENS_FORMAT_DURATION_COMPACT_DEFAULT,
          }
        : {}),
      ...(format.params?.suffix ? { suffix: format.params.suffix } : {}),
    };
  }
  if (format.id === 'custom' && format.params?.pattern) {
    return {
      type: format.id,
      pattern: format.params?.pattern,
    };
  }
}
