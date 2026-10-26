/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const trimNumber = (value: number): string => {
  const fixed = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
};

/** Formats a profile duration for the duration bar and operator rows. */
export function formatDurationMillis(millis: number): string {
  if (millis >= 1000) {
    return i18n.translate('data.inspector.queryProfile.durationSecondsLabel', {
      defaultMessage: '{seconds} s',
      values: { seconds: trimNumber(millis / 1000) },
    });
  }

  return i18n.translate('data.inspector.queryProfile.durationMillisLabel', {
    defaultMessage: '{millis} ms',
    values: { millis: trimNumber(millis) },
  });
}

/** Formats a byte count from a profile counter. */
export function formatBytes(bytes: number): string {
  const megabytes = bytes / 1e6;
  if (megabytes >= 1) {
    return i18n.translate('data.inspector.queryProfile.megabytesLabel', {
      defaultMessage: '{size} MB',
      values: { size: trimNumber(megabytes) },
    });
  }

  const kilobytes = bytes / 1e3;
  if (kilobytes >= 1) {
    return i18n.translate('data.inspector.queryProfile.kilobytesLabel', {
      defaultMessage: '{size} KB',
      values: { size: trimNumber(kilobytes) },
    });
  }

  return i18n.translate('data.inspector.queryProfile.bytesLabel', {
    defaultMessage: '{size} B',
    values: { size: trimNumber(bytes) },
  });
}

/** Formats decoded-bytes throughput. */
export function formatThroughput(bytesPerSecond: number): string {
  return i18n.translate('data.inspector.queryProfile.megabytesPerSecondLabel', {
    defaultMessage: '{rate} MB/s',
    values: { rate: trimNumber(bytesPerSecond / 1e6) },
  });
}

/** Formats an operator's share of process time. */
export function formatShare(share: number): string {
  const percent = share * 100;
  const rounded = percent >= 10 || percent === 0 ? String(Math.round(percent)) : percent.toFixed(1);
  return i18n.translate('data.inspector.queryProfile.percentLabel', {
    defaultMessage: '{percent}%',
    values: { percent: rounded },
  });
}

/** Formats how far stored bytes expanded into decoded values. */
export function formatExpansion(expansion: number): string {
  return i18n.translate('data.inspector.queryProfile.expansionLabel', {
    defaultMessage: '{ratio}×',
    values: { ratio: trimNumber(expansion) },
  });
}

/** Formats a row count. */
export function formatCount(count: number): string {
  return i18n.translate('data.inspector.queryProfile.countLabel', {
    defaultMessage: '{count, number}',
    values: { count },
  });
}
