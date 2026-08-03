import type { ScriptError } from '../components/preview/types';
import type { RuntimeFieldPainlessError, PainlessErrorCode } from '../types';
export declare const getErrorCodeFromErrorReason: (reason?: string) => PainlessErrorCode;
export declare const parseEsError: (scriptError: ScriptError) => RuntimeFieldPainlessError;
