/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATE_RANGE_DISPLAY_DELIMITER } from '../constants';
import type { TimeRangeBoundsOption } from '../types';
import { textToTimeRange } from './parse_text';

/**
 * Returns the label of a preset when it is a real name worth showing in the
 * presets list, the control button, and the input; `null` when the list and
 * input should be derived from the bounds instead.
 *
 * A label is derived, not a name, when it is display text frozen by an earlier
 * save (it contains the `→` display delimiter), or when it is raw input text
 * that re-parses to the option's own bounds (e.g. `"-15m to now"`). Every other
 * label — natural language like "Last 7 days", or custom names like
 * "Financial Year to Date" from `timepicker:quickRanges` — is kept. Custom
 * names round-trip through the input because the parser matches preset labels
 * before anything else.
 */
export function getPresetLabel(
  option: TimeRangeBoundsOption,
  options?: { locale?: string }
): string | null {
  const { label } = option;
  if (!label) return null;
  if (label.includes(DATE_RANGE_DISPLAY_DELIMITER)) return null;

  // Pass only `locale` to the parser: including `presets` would let the
  // option's own label self-match and defeat the raw-input check below.
  const parsed = textToTimeRange(label, { locale: options?.locale });
  if (parsed.isNaturalLanguage) return label;

  const isRawInputForm =
    !parsed.isInvalid && parsed.start === option.start && parsed.end === option.end;
  return isRawInputForm ? null : label;
}
