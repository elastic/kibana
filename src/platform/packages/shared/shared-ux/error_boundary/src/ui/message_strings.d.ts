export declare const errorMessageStrings: {
    page: {
        callout: {
            fatal: {
                title: () => string;
                body: () => string;
                showDetailsButton: () => string;
                pageReloadButton: () => string;
            };
            recoverable: {
                title: () => string;
                body: () => string;
                pageReloadButton: () => string;
            };
        };
    };
    section: {
        callout: {
            fatal: {
                title: (sectionName: string) => string;
                body: (sectionName: string) => string;
                showDetailsButton: () => string;
            };
            recoverable: {
                title: (sectionName: string) => string;
                body: (sectionName: string) => string;
                pageReloadButton: () => string;
            };
        };
    };
    details: {
        title: () => string;
        componentName: (errorComponentName: string) => string;
        closeButton: () => string;
        copyToClipboardButton: () => string;
    };
};
