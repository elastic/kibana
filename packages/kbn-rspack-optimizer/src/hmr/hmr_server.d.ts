export declare class HmrServer {
    private readonly server;
    private readonly clients;
    private readonly basePath;
    private assignedPort;
    private lastState;
    constructor(basePath?: string);
    start(): Promise<number>;
    get port(): number;
    broadcast(hash: string, time?: string, files?: string[]): void;
    broadcastBuilding(): void;
    broadcastErrors(errors: string[]): void;
    close(): Promise<void>;
}
