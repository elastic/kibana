import type { QuickFix } from './types';
import type { ErrorTypes } from '../../commands/definitions/types';
/**
 * Registry of quick fixes by error code.
 */
export declare const fixesByMessageCode: Partial<Record<ErrorTypes, QuickFix>>;
