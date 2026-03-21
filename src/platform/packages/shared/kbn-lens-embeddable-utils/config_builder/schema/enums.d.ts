interface Options<T extends string> {
    defaultValue?: T;
    meta?: {
        description: string;
    };
}
declare class BuilderEnums {
    orientation: (opts?: Options<"horizontal" | "vertical" | "angled">) => import("@kbn/config-schema").Type<"horizontal" | "vertical" | "angled">;
}
/**
 * Helper utility to create commonly used enum schemas with defaults
 */
export declare const builderEnums: BuilderEnums;
export {};
