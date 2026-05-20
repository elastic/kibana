import type { IconPosition, PrimaryMetricPosition, MetricStyleTemplateId } from './types';
/**
 * Returns the effective iconAlign value for a given state, mirroring the logic used
 * during expression rendering:
 * - If an icon is present but iconAlign is not stored (legacy state), fall back to the
 *   legacy default ('left') — the same default applied by the old metric vis renderer.
 * - Otherwise, use the stored value or the current shared default ('right').
 */
export declare function getEffectiveIconAlign(state: {
    icon?: string;
    iconAlign?: IconPosition;
}): IconPosition;
/**
 * Infers the active style template by comparing the given layout fields against
 * the known presets. Returns the matching preset id, or 'custom' if no preset matches.
 *
 * All absent fields are treated as their shared default values for comparison purposes.
 * `valueFontMode` and `iconAlign` are not preset-specific — they must equal the shared
 * defaults for any preset to match (i.e. non-default values always produce 'custom').
 */
export declare function inferStyleTemplate(state: {
    primaryPosition?: PrimaryMetricPosition;
    titlesTextAlign?: string;
    primaryAlign?: string;
    secondaryAlign?: string;
    valueFontMode?: string;
    iconAlign?: IconPosition;
    icon?: string;
}): MetricStyleTemplateId;
