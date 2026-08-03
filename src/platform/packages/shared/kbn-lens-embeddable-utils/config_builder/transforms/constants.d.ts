export declare const LENS_LAYER_SUFFIX = "indexpattern-datasource-layer-";
/**
 * Reference name prefix used by the XY visualization for the data view of a
 * by-value annotation layer. This must match the prefix produced by the Lens
 * XY persistence logic (`xy-visualization-layer-<layerId>`); otherwise the
 * runtime cannot resolve the annotation layer's data view and the panel fails
 * to render. See x-pack/.../lens/public/visualizations/xy/persistence.ts.
 */
export declare const LENS_XY_ANNOTATION_LAYER_SUFFIX = "xy-visualization-layer-";
export declare const LENS_DEFAULT_TIME_FIELD = "@timestamp";
export declare const INDEX_PATTERN_ID = "index-pattern";
