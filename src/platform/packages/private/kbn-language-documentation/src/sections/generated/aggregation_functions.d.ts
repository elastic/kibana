export declare const functions: {
    label: string;
    description: string;
    items: ({
        label: string;
        preview: boolean;
        license: undefined;
        description: {
            markdownContent: string;
        };
    } | {
        label: string;
        preview: boolean;
        license: {
            licenses: {
                name: string;
                isSignatureSpecific: boolean;
                paramsWithLicense: string[];
            }[];
            hasMultipleLicenses: boolean;
        };
        description: {
            markdownContent: string;
        };
    })[];
};
