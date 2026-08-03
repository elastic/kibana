import type { CoreSetup, Plugin } from '@kbn/core/server';
export declare class ScriptsService implements Plugin<void> {
    setup({ http }: CoreSetup): void;
    start(): void;
}
