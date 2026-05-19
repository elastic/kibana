export interface SpacingLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    distance: number;
    orientation: 'horizontal' | 'vertical';
}
/**
 * Calculate spacing lines between two bounding rects.
 *
 * - **Separated elements**: shows the gap between nearest edges (horizontal, vertical, or both).
 * - **Containment** (one inside the other): shows distances from inner edges to outer edges.
 * - **Partial overlap**: no lines shown (ambiguous, not useful).
 */
export declare const calculateSpacingLines: (anchorRect: DOMRect, targetRect: DOMRect) => SpacingLine[];
