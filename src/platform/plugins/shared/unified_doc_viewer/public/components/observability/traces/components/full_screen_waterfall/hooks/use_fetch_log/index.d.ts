interface UseFetchLogParams {
    id: string;
    index?: string;
}
export declare function useFetchLog({ id, index }: UseFetchLogParams): {
    loading: boolean;
    log: (Record<string, any> & import("utility-types").DeepPartial<{
        [x: number]: any;
    }> & import("utility-types").DeepPartial<{
        [x: symbol]: any;
    }>) | undefined;
    index: string | undefined;
};
export {};
