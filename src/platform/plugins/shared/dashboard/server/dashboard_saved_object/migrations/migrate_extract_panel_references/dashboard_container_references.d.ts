import type { Reference } from '@kbn/content-management-utils';
import type { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
export declare const getReferencesForPanelId: (id: string, references: Reference[]) => Reference[];
export declare const getReferencesForControls: (references: Reference[]) => Reference[];
export declare const prefixReferencesFromPanel: (id: string, references: Reference[]) => Reference[];
export declare const createInject: (persistableStateService: EmbeddablePersistableStateService) => EmbeddablePersistableStateService["inject"];
export declare const createExtract: (persistableStateService: EmbeddablePersistableStateService) => EmbeddablePersistableStateService["extract"];
