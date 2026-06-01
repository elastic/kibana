export interface EmbeddableApiContext {
    /**
     * TODO: once all actions are entirely decoupled from the embeddable system, this key should be renamed to "api"
     * to reflect the fact that this context could contain any api.
     */
    embeddable: unknown;
}
export declare const isEmbeddableApiContext: (context: unknown) => context is EmbeddableApiContext;
