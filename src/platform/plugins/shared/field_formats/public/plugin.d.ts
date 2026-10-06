import type { CoreSetup, Plugin } from '@kbn/core/public';
import { FieldFormatsRegistry } from '../common';
import type { FormatFactory } from '../common/types';
export declare class FieldFormatsPlugin implements Plugin<FieldFormatsSetup, FieldFormatsStart> {
    private readonly fieldFormatsRegistry;
    setup(core: CoreSetup): FieldFormatsSetup;
    start(): FieldFormatsStart;
    stop(): void;
}
/** @public */
export type FieldFormatsSetup = Pick<FieldFormatsRegistry, 'register' | 'has'>;
/** @public */
export type FieldFormatsStart = Omit<FieldFormatsRegistry, 'init' | 'register'> & {
    deserialize: FormatFactory;
};
