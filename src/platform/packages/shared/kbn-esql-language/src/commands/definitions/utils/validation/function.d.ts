import type { ESQLAst, ESQLAstAllCommands, ESQLFunction } from '@elastic/esql/types';
import type { PromQLFunction } from '@elastic/esql';
import type { ICommandCallbacks, ICommandContext } from '../../../registry/types';
import type { ESQLMessage, PromQLFunctionDefinition, PromQLFunctionParamType, PromQLSignature } from '../../types';
export declare function validateFunction({ fn, parentCommand, ast, context, callbacks, }: {
    fn: ESQLFunction;
    parentCommand: ESQLAstAllCommands;
    ast: ESQLAst;
    context: ICommandContext;
    callbacks: ICommandCallbacks;
}): ESQLMessage[];
export declare function getPromqlFunctionArityCheck(fn: PromQLFunction, definition: PromQLFunctionDefinition): {
    expected: string;
    actual: number;
} | null;
export declare function getPromqlMatchingSignatures(signatures: PromQLSignature[], argTypes: (PromQLFunctionParamType | undefined)[]): PromQLSignature[];
export declare function getPromqlSignatureMismatch(signatures: PromQLSignature[], argTypes: (PromQLFunctionParamType | undefined)[], argCount: number): {
    required: string;
    mismatchIdx: number;
} | null;
