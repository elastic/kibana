import type { ModificationAction } from '../types';
import type { RangePart } from './parse_range_parts';
/**
 * Applies an arrow-key modification to a selected range part. Relative
 * direction/unit words are resolved against `locale` merged with English —
 * whichever language the part's CURRENT text belongs to is preserved (a part
 * already typed in English is never silently translated into the active
 * locale). A word valid in both languages is attributed via the phrase's
 * other words, and a fully ambiguous phrase falls to the active locale — see
 * {@link resolveUnitSource}.
 */
export declare function applyPartModification(text: string, part: RangePart, action: ModificationAction, parts: RangePart[], locale?: string): string | undefined;
