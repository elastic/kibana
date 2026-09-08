import type { TimeRangeBoundsOption } from '../types';
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
export declare function getPresetLabel(option: TimeRangeBoundsOption, options?: {
    locale?: string;
}): string | null;
