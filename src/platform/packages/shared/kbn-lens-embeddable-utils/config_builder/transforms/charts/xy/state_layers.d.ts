import type { XYPersistedLayerConfig } from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { XYConfig } from '../../../schema/charts/xy';
export declare function getValueColumns(layer: unknown, i: number, xAxisScale?: 'temporal' | 'ordinal' | 'linear'): import("@kbn/lens-common").TextBasedLayerColumn[];
export declare function buildXYLayer(config: XYConfig, layer: unknown, i: number, dataViewId: string, annotationGroupReferences: SavedObjectReference[]): XYPersistedLayerConfig | undefined;
export declare function buildFormBasedXYLayer(layer: unknown, i: number): Record<string, import("@kbn/lens-common").PersistedIndexPatternLayer>;
