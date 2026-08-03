import type { Reference } from '@kbn/content-management-utils/src/types';
import type { StoredVis } from '../embeddable/transforms/types';
import type { SerializedVis } from '../types';
export declare function injectVisReferences(savedVis: StoredVis, references: Reference[]): SerializedVis;
