import { getSearchEmbeddableFactory } from './get_search_embeddable_factory';
export declare const getLegacyLogStreamEmbeddableFactory: (...[{ startServices, discoverServices }]: Parameters<typeof getSearchEmbeddableFactory>) => import("../../../embeddable/public").EmbeddableFactory<import("./types").SearchEmbeddablePanelApiState, import("./types").SearchEmbeddableApi>;
