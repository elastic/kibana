import Handlebars from 'handlebars';
import type { CompileOptions, RuntimeOptions } from './types';
export declare class ElasticHandlebarsVisitor extends Handlebars.Visitor {
    private env;
    private contexts;
    private output;
    private template?;
    private compileOptions;
    private runtimeOptions?;
    private blockParamNames;
    private blockParamValues;
    private ast?;
    private container;
    private defaultHelperOptions;
    private processedRootDecorators;
    private processedDecoratorsForProgram;
    constructor(env: typeof Handlebars, input: string | hbs.AST.Program, options?: CompileOptions);
    render(context: any, options?: RuntimeOptions): string;
    Program(program: hbs.AST.Program): void;
    MustacheStatement(mustache: hbs.AST.MustacheStatement): void;
    BlockStatement(block: hbs.AST.BlockStatement): void;
    PartialStatement(partial: hbs.AST.PartialStatement): void;
    PartialBlockStatement(partial: hbs.AST.PartialBlockStatement): void;
    DecoratorBlock(decorator: hbs.AST.DecoratorBlock): void;
    Decorator(decorator: hbs.AST.Decorator): void;
    SubExpression(sexpr: hbs.AST.SubExpression): void;
    PathExpression(path: hbs.AST.PathExpression): void;
    ContentStatement(content: hbs.AST.ContentStatement): void;
    StringLiteral(string: hbs.AST.StringLiteral): void;
    NumberLiteral(number: hbs.AST.NumberLiteral): void;
    BooleanLiteral(bool: hbs.AST.BooleanLiteral): void;
    UndefinedLiteral(): void;
    NullLiteral(): void;
    /**
     * Special code for decorators, since they have to be executed ahead of time (before the wrapping program).
     * So we have to look into the program AST body and see if it contains any decorators that we have to process
     * before we can finish processing of the wrapping program.
     */
    private processDecorators;
    private processDecorator;
    private processStatementOrExpression;
    private classifyNode;
    private blockParamIndex;
    private lookupBlockParam;
    private lookupData;
    private pushToOutputWithEscapeCheck;
    private processSimpleNode;
    private blockValue;
    private processHelperNode;
    private invokeKnownHelper;
    private invokeHelper;
    private invokePartial;
    private processAmbiguousNode;
    private setupHelper;
    private setupDecoratorOptions;
    private setupParams;
    private generateProgramFunction;
    private getHash;
    private resolvePath;
    private strictLookup;
    private resolveNodes;
    private get context();
}
