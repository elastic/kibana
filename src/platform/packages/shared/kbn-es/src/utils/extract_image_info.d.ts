export declare const extractImageInfo: ((image: string) => Promise<any>) & import("lodash").MemoizedFunction;
export declare function getImageVersion(image: string): Promise<string | null>;
export declare function getCommitUrl(image: string): Promise<string | null>;
export declare function getServerlessImageTag(image: string): Promise<string | null>;
