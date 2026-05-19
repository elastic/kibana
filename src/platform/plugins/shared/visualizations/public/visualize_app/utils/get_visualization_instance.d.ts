import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { Vis, VisSavedObject, VisualizeEmbeddableContract } from '../..';
import type { VisInstance, VisualizeServices } from '../types';
import type { VisualizeInput } from '../../legacy/embeddable';
export declare const getVisualizationInstanceFromInput: (visualizeServices: VisualizeServices, input: VisualizeInput) => Promise<{
    vis: Vis<import("@kbn/visualizations-common").VisParams>;
    savedVis: VisSavedObject;
    embeddableHandler: VisualizeEmbeddableContract;
    savedSearch: SavedSearch | undefined;
    panelTitle: string;
    panelDescription: string;
    panelTimeRange: import("@kbn/es-query").TimeRange | undefined;
}>;
export declare const getVisualizationInstance: (visualizeServices: VisualizeServices, 
/**
 * opts can be either a saved visualization id passed as string,
 * or an object of new visualization params.
 * Both come from url search query
 */
opts?: Record<string, unknown> | string) => Promise<VisInstance>;
