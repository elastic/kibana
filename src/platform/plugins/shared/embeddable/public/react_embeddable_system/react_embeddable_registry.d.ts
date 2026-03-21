import type { DefaultEmbeddableApi, EmbeddableFactory } from './types';
/**
 * Registers a new React embeddable factory. This should be called at plugin start time.
 *
 * @param type The key to register the factory under.
 * @param getFactory an async function that gets the factory definition for this key. This should always async import the
 * actual factory definition file to avoid polluting page load.
 */
export declare const registerReactEmbeddableFactory: <SerializedState extends object = object, Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>>(type: string, getFactory: () => Promise<EmbeddableFactory<SerializedState, Api>>) => void;
export declare const getReactEmbeddableFactory: <SerializedState extends object = object, Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>>(key: string) => Promise<EmbeddableFactory<SerializedState, Api>>;
