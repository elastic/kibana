import type { DefaultEmbeddableApi, EmbeddableFactory } from './types';
export declare const TYPE_REGEX: RegExp;
/**
 * Registers an embeddable public defintion. This should be called at plugin setup time.
 * Be sure to register an embeddable server definition for this type.
 *
 * @param type The key to register the embeddable public defintion. Part of public "dashboards as code" REST API.
 * Must be lower case, snake cased, and concise.
 * @param getFactory an async function that gets the factory definition for this key. This should always async import the
 * actual factory definition file to avoid polluting page load.
 */
export declare const registerEmbeddablePublicDefinition: <SerializedState extends object = object, Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>>(type: string, getFactory: () => Promise<EmbeddableFactory<SerializedState, Api>>) => void;
export declare const getReactEmbeddableFactory: <SerializedState extends object = object, Api extends DefaultEmbeddableApi<SerializedState> = DefaultEmbeddableApi<SerializedState>>(key: string) => Promise<EmbeddableFactory<SerializedState, Api> | undefined>;
export declare function closeSetup(): void;
