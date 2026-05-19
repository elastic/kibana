interface MatchPairsOptions {
    value: string;
    selectionStart: number;
    selectionEnd: number;
    key: string;
    metaKey: boolean;
    updateQuery: (query: string, selectionStart: number, selectionEnd: number) => void;
    preventDefault: () => void;
}
export declare function matchPairs({ value, selectionStart, selectionEnd, key, metaKey, updateQuery, preventDefault, }: MatchPairsOptions): void;
export {};
