import type { AmbiguousHelperOptions, DecoratorOptions } from './types';
export declare function isBlock(node: hbs.AST.Node): node is hbs.AST.BlockStatement;
export declare function isDecorator(node: hbs.AST.Node): node is hbs.AST.Decorator | hbs.AST.DecoratorBlock;
export declare function toDecoratorOptions(options: AmbiguousHelperOptions): DecoratorOptions;
export declare function noop(): string;
export declare function initData(context: any, data: any): any;
export declare function transformLiteralToPath(node: {
    path: hbs.AST.PathExpression | hbs.AST.Literal;
}): void;
export declare function allowUnsafeEval(): boolean;
