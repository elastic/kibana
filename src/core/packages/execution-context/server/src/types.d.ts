import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
/**
 * @public
 */
export interface IExecutionContextContainer {
    toString(): string;
    toJSON(): Readonly<KibanaExecutionContext>;
}
