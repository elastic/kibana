import type { ReporterVersion } from 'axe-core';
export declare const AXE_CONFIG: {
    rules: {
        id: string;
        selector: string;
    }[];
};
export declare const AXE_OPTIONS: {
    reporter: ReporterVersion;
    runOnly: string[];
    rules: {
        'color-contrast': {
            enabled: boolean;
        };
        bypass: {
            enabled: boolean;
        };
        'nested-interactive': {
            enabled: boolean;
        };
    };
};
