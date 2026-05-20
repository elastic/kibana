import type { getSearchEmbeddableFactory } from './get_search_embeddable_factory';
export declare const getLegacyLogStreamEmbeddableFactory: (...[{ startServices, discoverServices }]: Parameters<typeof getSearchEmbeddableFactory>) => import("../../../embeddable/public").EmbeddablePublicDefinition<import("./types").SearchEmbeddablePanelApiState, import("./types").SearchEmbeddableApi>;
