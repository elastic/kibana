/**
 * Release stage of a visualization type
 */
export type VisualizationStage = 'experimental' | 'beta' | 'production';
/**
 * Represents a visualization item in the listing table
 */
export interface VisualizationListItem {
    /** Optional error message if the visualization failed to load */
    error?: string;
    /** Icon identifier for the visualization type */
    icon?: string;
    /** Image URL for custom visualization type icons */
    image?: string;
    /** Release stage of the visualization type */
    stage?: VisualizationStage;
    /** Display name of the visualization type */
    typeTitle?: string;
}
