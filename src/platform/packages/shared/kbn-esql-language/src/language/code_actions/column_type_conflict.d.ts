import type { QuickFix, QuickFixMessage } from './types';
/** Build quick fixes from the diagnostic data and keep the message location for insertion. */
export declare const getColumnTypeConflictQuickFixes: (message: QuickFixMessage) => QuickFix[];
