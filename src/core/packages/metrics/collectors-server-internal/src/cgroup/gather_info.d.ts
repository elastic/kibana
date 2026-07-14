type Result = {
    v2: true;
    path: string;
} | {
    v2: false;
    data: Record<string, string>;
};
export declare function gatherInfo(): Promise<Result>;
export {};
