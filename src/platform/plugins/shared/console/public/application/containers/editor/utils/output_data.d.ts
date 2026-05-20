export declare const isJSONContentType: (contentType?: string) => boolean;
export declare const isMapboxVectorTile: (contentType?: string) => boolean;
/**
 * Best effort expand literal strings
 */
export declare const safeExpandLiteralStrings: (data: string) => string;
export declare const languageForContentType: (contentType?: string) => "text" | "yaml" | "consoleOutput";
