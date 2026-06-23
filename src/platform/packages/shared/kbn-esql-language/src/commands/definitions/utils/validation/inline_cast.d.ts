import type { WalkerAstNode } from '@elastic/esql';
import type { ESQLMessage } from '../../..';
import type { ICommandContext } from '../../../registry/types';
/**
 * Validates inline casts within the given AST node.
 */
export declare function validateInlineCasts(astNode: WalkerAstNode, context: ICommandContext): ESQLMessage[];
