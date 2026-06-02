import React from 'react';
import type { ReactContextTypeHit } from '../../types';
/**
 * Resolves the applicable highlight method for a field value.
 *
 * - DSL: we receive a clean fieldValue and a side list of substrings to be highlighted.
 *   Example:
 *   fieldValue = "lorem ipsum dolor"
 *   fieldName = "myField"
 *   hit = { highlight: { myField: ["ipsum", "dolor"] } }
 *   return = "lorem <mark>ipsum</mark> <mark>dolor</mark>"
 *
 * - ES|QL: we receive a fieldValue with inline <em> (or custom) tags.
 *   Example:
 *   fieldValue = "<em>lorem</em> ipsum <em>dolor</em>"
 *   fieldName = "myField"
 *   hit = { inline_highlights: { myField: { preTag: "<em>", postTag: "</em>" } } }
 *   return = "<mark>lorem</mark> ipsum <mark>dolor</mark>"
 */
export declare function getHighlightReact(fieldValue: string, fieldName: string | undefined, hit: ReactContextTypeHit | undefined): React.ReactNode;
