import type { CoreStart, Logger } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';
import type { StartDeps } from './plugin';
export declare let coreServices: CoreStart;
export declare let embeddableService: EmbeddableStart;
export declare let taggingService: SavedObjectTaggingStart | undefined;
export declare let logger: Logger;
export declare const setKibanaServices: (core: CoreStart, deps: StartDeps, _logger: Logger) => void;
