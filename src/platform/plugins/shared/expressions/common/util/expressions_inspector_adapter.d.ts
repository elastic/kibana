import { EventEmitter } from 'events';
import type { ExpressionAstNode } from '..';
export declare class ExpressionsInspectorAdapter extends EventEmitter {
    private _ast;
    logAST(ast: ExpressionAstNode): void;
    get ast(): ExpressionAstNode;
}
