interface Options<T extends string> {
    defaultValue?: T;
    meta?: {
        id?: string;
        description?: string;
    };
}
declare class BuilderEnums {
    orientation: (opts?: Options<"horizontal" | "vertical" | "angled">) => import("@kbn/config-schema").Type<"horizontal" | "vertical" | "angled">;
    simpleOrientation: (opts?: Options<"horizontal" | "vertical">) => import("@kbn/config-schema").Type<"horizontal" | "vertical">;
    direction: (opts?: Options<"asc" | "desc">) => import("@kbn/config-schema").Type<"asc" | "desc">;
}
/**
 * Helper utility to create commonly used enum schemas with defaults
 */
export declare const builderEnums: BuilderEnums;
export {};
