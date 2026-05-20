import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { DiscoverServices } from '../build_services';
import type { SearchEmbeddableApi, SearchEmbeddablePanelApiState } from './types';
export declare const getSearchEmbeddableFactory: ({ startServices, discoverServices, }: {
    startServices: {
        executeTriggerActions: (triggerId: string, context: object) => Promise<void>;
        isEditable: () => boolean;
    };
    discoverServices: DiscoverServices;
}) => EmbeddablePublicDefinition<SearchEmbeddablePanelApiState, SearchEmbeddableApi>;
