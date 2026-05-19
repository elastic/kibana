export declare const commands: {
    label: string;
    description: string;
    items: ({
        label: string;
        description: {
            markdownContent: string;
            openLinksInNewTab: boolean;
        };
        preview?: undefined;
    } | {
        label: string;
        preview: boolean;
        description: {
            markdownContent: string;
            openLinksInNewTab: boolean;
        };
    })[];
};
