export declare const commands: {
    label: string;
    description: string;
    items: ({
        label: string;
        preview: boolean;
        description: {
            markdownContent: string;
            openLinksInNewTab: boolean;
        };
        license: {
            licenses: {
                name: string;
            }[];
            hasMultipleLicenses: boolean;
        };
    } | {
        label: string;
        preview: boolean;
        description: {
            markdownContent: string;
            openLinksInNewTab: boolean;
        };
        license?: undefined;
    } | {
        label: string;
        description: {
            markdownContent: string;
            openLinksInNewTab: boolean;
        };
        preview?: undefined;
        license?: undefined;
    })[];
};
