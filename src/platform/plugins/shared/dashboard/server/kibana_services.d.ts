import type { Logger } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { StartDeps } from './plugin';
export declare let embeddableService: EmbeddableStart;
export declare let logger: Logger;
export declare const setKibanaServices: (deps: StartDeps, _logger: Logger) => void;
