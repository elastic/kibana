import type { Layout } from '@kbn/logging';
import type { LayoutConfigType } from '@kbn/core-logging-server';
/** @internal */
export declare class Layouts {
    static configSchema: import("@kbn/config-schema").Type<Readonly<{} & {
        type: "json";
    }> | Readonly<{
        pattern?: string | undefined;
        highlight?: boolean | undefined;
    } & {
        type: "pattern";
    }>>;
    /**
     * Factory method that creates specific `Layout` instances based on the passed `config` parameter.
     * @param config Configuration specific to a particular `Layout` implementation.
     * @returns Fully constructed `Layout` instance.
     */
    static create(config: LayoutConfigType): Layout;
}
