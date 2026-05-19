export interface BootstrapTemplateData {
    colorMode: string;
    themeTagName: string;
    jsDependencyPaths: string[];
    publicPathMap: string;
    useHMR?: boolean;
    useRspack?: boolean;
}
export declare const renderTemplate: ({ themeTagName, colorMode, jsDependencyPaths, publicPathMap, useHMR, useRspack, }: BootstrapTemplateData) => string;
