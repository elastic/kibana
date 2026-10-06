export declare function readReturnParamsFromHash(hash: string): {
    returnAppId: string;
    returnPath: string;
} | undefined;
export declare function getTutorialDirectoryFirstCrumb({ hash, addBasePath, getUrlForApp, }: {
    hash: string;
    addBasePath: (path: string) => string;
    getUrlForApp: (appId: string, options: {
        path: string;
    }) => string;
}): {
    text: string;
    href: string;
};
export declare function getTutorialDirectoryAppHeaderBack({ hash, addBasePath, getUrlForApp, }: {
    hash: string;
    addBasePath: (path: string) => string;
    getUrlForApp: (appId: string, options: {
        path: string;
    }) => string;
}): {
    href: string;
    label: string;
};
export declare function getTutorialIntroductionBackLink({ hash, addBasePath, getUrlForApp, }: {
    hash: string;
    addBasePath: (path: string) => string;
    getUrlForApp: (appId: string, options: {
        path: string;
    }) => string;
}): {
    href: string;
    text?: string;
};
