import type * as TaskEither from 'fp-ts/TaskEither';
export interface WaitForDelayParams {
    delayInSec: number;
}
export declare const waitForDelay: ({ delayInSec, }: WaitForDelayParams) => TaskEither.TaskEither<never, "wait_succeeded">;
