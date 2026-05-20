import type { PersistedIndexPatternLayer } from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FormulaValueConfig } from '../types';
export declare function getFormulaColumn(id: string, config: FormulaValueConfig, dataView: DataView, baseLayer?: PersistedIndexPatternLayer): {
    columnOrder: string[];
    columns: {
        [x: string]: import("@kbn/lens-common").BaseIndexPatternColumn | import("@kbn/lens-common").FieldBasedIndexPatternColumn | import("@kbn/lens-common").ReferenceBasedIndexPatternColumn | {
            customLabel: boolean;
            params: {
                formula: string;
                format: {
                    id: string;
                    params?: {
                        decimals: number;
                        compact?: boolean;
                    };
                } | undefined;
            };
            filter?: import("@kbn/es-query").Query;
            reducedTimeRange?: string;
            timeScale?: import("@kbn/lens-common").TimeScaleUnit;
            color?: string;
            operationType: "formula";
            isBucketed: false;
            dataType: "number";
            references: never[];
            label: string;
        };
    };
    ignoreGlobalFilters?: boolean;
    sampling?: number;
    linkToLayers?: string[];
    incompleteColumns?: Record<string, import("@kbn/lens-common").IncompleteColumn | undefined>;
};
