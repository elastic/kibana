import type { State } from './types';
import type { MigratorContext } from '../context';
/**
 * Create the initial state to be used for the ZDT migrator.
 */
export declare const createInitialState: (context: MigratorContext) => State;
