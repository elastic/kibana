export declare function getHighlightRequest(shouldHighlight: boolean): {
    pre_tags: string[];
    post_tags: string[];
    fields: {
        '*': {};
    };
    fragment_size: number;
} | undefined;
