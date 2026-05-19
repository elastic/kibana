export declare const archive: {
    description: string;
    usage: string;
    help: (defaults?: Record<string, any>) => string;
    run: (defaults?: {}) => Promise<void>;
};
