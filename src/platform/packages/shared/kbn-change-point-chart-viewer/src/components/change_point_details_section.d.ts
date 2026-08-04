import React from 'react';
import type { UnifiedHistogramServices } from '@kbn/unified-histogram/types';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';
interface ChangePointDetailsSectionProps {
    card: ChangePointCardModel;
    row: Readonly<Record<string, unknown>>;
    seriesColumns: {
        valueColumn: string;
        timeColumn: string;
    };
    fieldFormats: UnifiedHistogramServices['fieldFormats'];
}
/**
 * Displays change-point properties beneath the mini chart in the flyout.
 *
 * Short categorical facts (time, field, metric, type, p-value) are shown in a
 * two-column stat grid — muted label above a larger value — so they can be
 * scanned at a glance. The prose description is separated below a rule so it
 * gets its own reading space. Any item is omitted when its data is absent.
 */
export declare const ChangePointDetailsSection: React.FC<ChangePointDetailsSectionProps>;
export {};
