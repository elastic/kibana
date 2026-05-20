export declare const useTruncateText: (text: string, maxLength?: number, maxCharLength?: number) => {
    displayText: string;
    isExpanded: boolean;
    toggleExpanded: () => void;
    shouldTruncate: boolean;
};
