export declare const commands: {
    snapshot: import("./types").Command;
    source: import("./types").Command;
    archive: {
        description: string;
        usage: string;
        help: (defaults?: Record<string, any>) => string;
        run: (defaults?: {}) => Promise<void>;
    };
    build_snapshots: import("./types").Command;
    docker: import("./types").Command;
    serverless: import("./types").Command;
};
