export interface Command {
    description: string;
    usage?: string;
    help: (defaults: Record<string, any>) => string;
    run: (defaults: Record<string, any>) => Promise<void>;
}
