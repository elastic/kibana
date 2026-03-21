import type { DrilldownTransforms, EmbeddableTransforms } from '../../common';
export declare function registerLegacyURLTransform(type: string, getTransformOut: (transformDrilldownsOut: DrilldownTransforms['transformOut']) => Promise<EmbeddableTransforms['transformOut']>): void;
export declare function getLegacyURLTransform(embeddableType: string): Promise<((storedState: object, panelReferences?: import("@kbn/content-management-utils").Reference[], containerReferences?: import("@kbn/content-management-utils").Reference[], id?: string) => object) | undefined>;
export declare function hasLegacyURLTransform(type: string): boolean;
