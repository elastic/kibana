import { ATN, DFA, FailedPredicateException, Parser, RuleContext, ParserRuleContext, TerminalNode, TokenStream } from 'antlr4';
import painless_parserListener from "./painless_parserListener.js";
export default class painless_parser extends Parser {
    static readonly WS = 1;
    static readonly COMMENT = 2;
    static readonly LBRACK = 3;
    static readonly RBRACK = 4;
    static readonly LBRACE = 5;
    static readonly RBRACE = 6;
    static readonly LP = 7;
    static readonly RP = 8;
    static readonly DOLLAR = 9;
    static readonly DOT = 10;
    static readonly NSDOT = 11;
    static readonly COMMA = 12;
    static readonly SEMICOLON = 13;
    static readonly IF = 14;
    static readonly IN = 15;
    static readonly ELSE = 16;
    static readonly WHILE = 17;
    static readonly DO = 18;
    static readonly FOR = 19;
    static readonly CONTINUE = 20;
    static readonly BREAK = 21;
    static readonly RETURN = 22;
    static readonly NEW = 23;
    static readonly TRY = 24;
    static readonly CATCH = 25;
    static readonly THROW = 26;
    static readonly THIS = 27;
    static readonly INSTANCEOF = 28;
    static readonly BOOLNOT = 29;
    static readonly BWNOT = 30;
    static readonly MUL = 31;
    static readonly DIV = 32;
    static readonly REM = 33;
    static readonly ADD = 34;
    static readonly SUB = 35;
    static readonly LSH = 36;
    static readonly RSH = 37;
    static readonly USH = 38;
    static readonly LT = 39;
    static readonly LTE = 40;
    static readonly GT = 41;
    static readonly GTE = 42;
    static readonly EQ = 43;
    static readonly EQR = 44;
    static readonly NE = 45;
    static readonly NER = 46;
    static readonly BWAND = 47;
    static readonly XOR = 48;
    static readonly BWOR = 49;
    static readonly BOOLAND = 50;
    static readonly BOOLOR = 51;
    static readonly COND = 52;
    static readonly COLON = 53;
    static readonly ELVIS = 54;
    static readonly REF = 55;
    static readonly ARROW = 56;
    static readonly FIND = 57;
    static readonly MATCH = 58;
    static readonly INCR = 59;
    static readonly DECR = 60;
    static readonly ASSIGN = 61;
    static readonly AADD = 62;
    static readonly ASUB = 63;
    static readonly AMUL = 64;
    static readonly ADIV = 65;
    static readonly AREM = 66;
    static readonly AAND = 67;
    static readonly AXOR = 68;
    static readonly AOR = 69;
    static readonly ALSH = 70;
    static readonly ARSH = 71;
    static readonly AUSH = 72;
    static readonly OCTAL = 73;
    static readonly HEX = 74;
    static readonly INTEGER = 75;
    static readonly DECIMAL = 76;
    static readonly STRING = 77;
    static readonly REGEX = 78;
    static readonly TRUE = 79;
    static readonly FALSE = 80;
    static readonly NULL = 81;
    static readonly PRIMITIVE = 82;
    static readonly DEF = 83;
    static readonly ID = 84;
    static readonly DOTINTEGER = 85;
    static readonly DOTID = 86;
    static readonly EOF: number;
    static readonly RULE_source = 0;
    static readonly RULE_function = 1;
    static readonly RULE_parameters = 2;
    static readonly RULE_statement = 3;
    static readonly RULE_rstatement = 4;
    static readonly RULE_dstatement = 5;
    static readonly RULE_trailer = 6;
    static readonly RULE_block = 7;
    static readonly RULE_empty = 8;
    static readonly RULE_initializer = 9;
    static readonly RULE_afterthought = 10;
    static readonly RULE_declaration = 11;
    static readonly RULE_decltype = 12;
    static readonly RULE_type = 13;
    static readonly RULE_declvar = 14;
    static readonly RULE_trap = 15;
    static readonly RULE_noncondexpression = 16;
    static readonly RULE_expression = 17;
    static readonly RULE_unary = 18;
    static readonly RULE_unarynotaddsub = 19;
    static readonly RULE_castexpression = 20;
    static readonly RULE_primordefcasttype = 21;
    static readonly RULE_refcasttype = 22;
    static readonly RULE_chain = 23;
    static readonly RULE_primary = 24;
    static readonly RULE_postfix = 25;
    static readonly RULE_postdot = 26;
    static readonly RULE_callinvoke = 27;
    static readonly RULE_fieldaccess = 28;
    static readonly RULE_braceaccess = 29;
    static readonly RULE_arrayinitializer = 30;
    static readonly RULE_listinitializer = 31;
    static readonly RULE_mapinitializer = 32;
    static readonly RULE_maptoken = 33;
    static readonly RULE_arguments = 34;
    static readonly RULE_argument = 35;
    static readonly RULE_lambda = 36;
    static readonly RULE_lamtype = 37;
    static readonly RULE_funcref = 38;
    static readonly literalNames: (string | null)[];
    static readonly symbolicNames: (string | null)[];
    static readonly ruleNames: string[];
    get grammarFileName(): string;
    get literalNames(): (string | null)[];
    get symbolicNames(): (string | null)[];
    get ruleNames(): string[];
    get serializedATN(): number[];
    protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException;
    constructor(input: TokenStream);
    source(): SourceContext;
    function_(): FunctionContext;
    parameters(): ParametersContext;
    statement(): StatementContext;
    rstatement(): RstatementContext;
    dstatement(): DstatementContext;
    trailer(): TrailerContext;
    block(): BlockContext;
    empty(): EmptyContext;
    initializer(): InitializerContext;
    afterthought(): AfterthoughtContext;
    declaration(): DeclarationContext;
    decltype(): DecltypeContext;
    type_(): TypeContext;
    declvar(): DeclvarContext;
    trap(): TrapContext;
    noncondexpression(): NoncondexpressionContext;
    noncondexpression(_p: number): NoncondexpressionContext;
    expression(): ExpressionContext;
    unary(): UnaryContext;
    unarynotaddsub(): UnarynotaddsubContext;
    castexpression(): CastexpressionContext;
    primordefcasttype(): PrimordefcasttypeContext;
    refcasttype(): RefcasttypeContext;
    chain(): ChainContext;
    primary(): PrimaryContext;
    postfix(): PostfixContext;
    postdot(): PostdotContext;
    callinvoke(): CallinvokeContext;
    fieldaccess(): FieldaccessContext;
    braceaccess(): BraceaccessContext;
    arrayinitializer(): ArrayinitializerContext;
    listinitializer(): ListinitializerContext;
    mapinitializer(): MapinitializerContext;
    maptoken(): MaptokenContext;
    arguments(): ArgumentsContext;
    argument(): ArgumentContext;
    lambda(): LambdaContext;
    lamtype(): LamtypeContext;
    funcref(): FuncrefContext;
    sempred(localctx: RuleContext, ruleIndex: number, predIndex: number): boolean;
    private rstatement_sempred;
    private noncondexpression_sempred;
    static readonly _serializedATN: number[];
    private static __ATN;
    static get _ATN(): ATN;
    static DecisionsToDFA: DFA[];
}
export declare class SourceContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    EOF(): TerminalNode;
    function__list(): FunctionContext[];
    function_(i: number): FunctionContext;
    statement_list(): StatementContext[];
    statement(i: number): StatementContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class FunctionContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    decltype(): DecltypeContext;
    ID(): TerminalNode;
    parameters(): ParametersContext;
    block(): BlockContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ParametersContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    LP(): TerminalNode;
    RP(): TerminalNode;
    decltype_list(): DecltypeContext[];
    decltype(i: number): DecltypeContext;
    ID_list(): TerminalNode[];
    ID(i: number): TerminalNode;
    COMMA_list(): TerminalNode[];
    COMMA(i: number): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class StatementContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    rstatement(): RstatementContext;
    dstatement(): DstatementContext;
    SEMICOLON(): TerminalNode;
    EOF(): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class RstatementContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: RstatementContext): void;
}
export declare class ForContext extends RstatementContext {
    constructor(parser: painless_parser, ctx: RstatementContext);
    FOR(): TerminalNode;
    LP(): TerminalNode;
    SEMICOLON_list(): TerminalNode[];
    SEMICOLON(i: number): TerminalNode;
    RP(): TerminalNode;
    trailer(): TrailerContext;
    empty(): EmptyContext;
    initializer(): InitializerContext;
    expression(): ExpressionContext;
    afterthought(): AfterthoughtContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class TryContext extends RstatementContext {
    constructor(parser: painless_parser, ctx: RstatementContext);
    TRY(): TerminalNode;
    block(): BlockContext;
    trap_list(): TrapContext[];
    trap(i: number): TrapContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class WhileContext extends RstatementContext {
    constructor(parser: painless_parser, ctx: RstatementContext);
    WHILE(): TerminalNode;
    LP(): TerminalNode;
    expression(): ExpressionContext;
    RP(): TerminalNode;
    trailer(): TrailerContext;
    empty(): EmptyContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class IneachContext extends RstatementContext {
    constructor(parser: painless_parser, ctx: RstatementContext);
    FOR(): TerminalNode;
    LP(): TerminalNode;
    ID(): TerminalNode;
    IN(): TerminalNode;
    expression(): ExpressionContext;
    RP(): TerminalNode;
    trailer(): TrailerContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class IfContext extends RstatementContext {
    constructor(parser: painless_parser, ctx: RstatementContext);
    IF(): TerminalNode;
    LP(): TerminalNode;
    expression(): ExpressionContext;
    RP(): TerminalNode;
    trailer_list(): TrailerContext[];
    trailer(i: number): TrailerContext;
    ELSE(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class EachContext extends RstatementContext {
    constructor(parser: painless_parser, ctx: RstatementContext);
    FOR(): TerminalNode;
    LP(): TerminalNode;
    decltype(): DecltypeContext;
    ID(): TerminalNode;
    COLON(): TerminalNode;
    expression(): ExpressionContext;
    RP(): TerminalNode;
    trailer(): TrailerContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class DstatementContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: DstatementContext): void;
}
export declare class DeclContext extends DstatementContext {
    constructor(parser: painless_parser, ctx: DstatementContext);
    declaration(): DeclarationContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class BreakContext extends DstatementContext {
    constructor(parser: painless_parser, ctx: DstatementContext);
    BREAK(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ThrowContext extends DstatementContext {
    constructor(parser: painless_parser, ctx: DstatementContext);
    THROW(): TerminalNode;
    expression(): ExpressionContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ContinueContext extends DstatementContext {
    constructor(parser: painless_parser, ctx: DstatementContext);
    CONTINUE(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ExprContext extends DstatementContext {
    constructor(parser: painless_parser, ctx: DstatementContext);
    expression(): ExpressionContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class DoContext extends DstatementContext {
    constructor(parser: painless_parser, ctx: DstatementContext);
    DO(): TerminalNode;
    block(): BlockContext;
    WHILE(): TerminalNode;
    LP(): TerminalNode;
    expression(): ExpressionContext;
    RP(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ReturnContext extends DstatementContext {
    constructor(parser: painless_parser, ctx: DstatementContext);
    RETURN(): TerminalNode;
    expression(): ExpressionContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class TrailerContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    block(): BlockContext;
    statement(): StatementContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class BlockContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    LBRACK(): TerminalNode;
    RBRACK(): TerminalNode;
    statement_list(): StatementContext[];
    statement(i: number): StatementContext;
    dstatement(): DstatementContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class EmptyContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    SEMICOLON(): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class InitializerContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    declaration(): DeclarationContext;
    expression(): ExpressionContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class AfterthoughtContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    expression(): ExpressionContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class DeclarationContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    decltype(): DecltypeContext;
    declvar_list(): DeclvarContext[];
    declvar(i: number): DeclvarContext;
    COMMA_list(): TerminalNode[];
    COMMA(i: number): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class DecltypeContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    type_(): TypeContext;
    LBRACE_list(): TerminalNode[];
    LBRACE(i: number): TerminalNode;
    RBRACE_list(): TerminalNode[];
    RBRACE(i: number): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class TypeContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    DEF(): TerminalNode;
    PRIMITIVE(): TerminalNode;
    ID(): TerminalNode;
    DOT_list(): TerminalNode[];
    DOT(i: number): TerminalNode;
    DOTID_list(): TerminalNode[];
    DOTID(i: number): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class DeclvarContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    ID(): TerminalNode;
    ASSIGN(): TerminalNode;
    expression(): ExpressionContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class TrapContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    CATCH(): TerminalNode;
    LP(): TerminalNode;
    type_(): TypeContext;
    ID(): TerminalNode;
    RP(): TerminalNode;
    block(): BlockContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class NoncondexpressionContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: NoncondexpressionContext): void;
}
export declare class SingleContext extends NoncondexpressionContext {
    constructor(parser: painless_parser, ctx: NoncondexpressionContext);
    unary(): UnaryContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class CompContext extends NoncondexpressionContext {
    constructor(parser: painless_parser, ctx: NoncondexpressionContext);
    noncondexpression_list(): NoncondexpressionContext[];
    noncondexpression(i: number): NoncondexpressionContext;
    LT(): TerminalNode;
    LTE(): TerminalNode;
    GT(): TerminalNode;
    GTE(): TerminalNode;
    EQ(): TerminalNode;
    EQR(): TerminalNode;
    NE(): TerminalNode;
    NER(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class BoolContext extends NoncondexpressionContext {
    constructor(parser: painless_parser, ctx: NoncondexpressionContext);
    noncondexpression_list(): NoncondexpressionContext[];
    noncondexpression(i: number): NoncondexpressionContext;
    BOOLAND(): TerminalNode;
    BOOLOR(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class BinaryContext extends NoncondexpressionContext {
    constructor(parser: painless_parser, ctx: NoncondexpressionContext);
    noncondexpression_list(): NoncondexpressionContext[];
    noncondexpression(i: number): NoncondexpressionContext;
    MUL(): TerminalNode;
    DIV(): TerminalNode;
    REM(): TerminalNode;
    ADD(): TerminalNode;
    SUB(): TerminalNode;
    FIND(): TerminalNode;
    MATCH(): TerminalNode;
    LSH(): TerminalNode;
    RSH(): TerminalNode;
    USH(): TerminalNode;
    BWAND(): TerminalNode;
    XOR(): TerminalNode;
    BWOR(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ElvisContext extends NoncondexpressionContext {
    constructor(parser: painless_parser, ctx: NoncondexpressionContext);
    noncondexpression_list(): NoncondexpressionContext[];
    noncondexpression(i: number): NoncondexpressionContext;
    ELVIS(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class InstanceofContext extends NoncondexpressionContext {
    constructor(parser: painless_parser, ctx: NoncondexpressionContext);
    noncondexpression(): NoncondexpressionContext;
    INSTANCEOF(): TerminalNode;
    decltype(): DecltypeContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ExpressionContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: ExpressionContext): void;
}
export declare class ConditionalContext extends ExpressionContext {
    constructor(parser: painless_parser, ctx: ExpressionContext);
    noncondexpression(): NoncondexpressionContext;
    COND(): TerminalNode;
    expression_list(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    COLON(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class AssignmentContext extends ExpressionContext {
    constructor(parser: painless_parser, ctx: ExpressionContext);
    noncondexpression(): NoncondexpressionContext;
    expression(): ExpressionContext;
    ASSIGN(): TerminalNode;
    AADD(): TerminalNode;
    ASUB(): TerminalNode;
    AMUL(): TerminalNode;
    ADIV(): TerminalNode;
    AREM(): TerminalNode;
    AAND(): TerminalNode;
    AXOR(): TerminalNode;
    AOR(): TerminalNode;
    ALSH(): TerminalNode;
    ARSH(): TerminalNode;
    AUSH(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class NonconditionalContext extends ExpressionContext {
    constructor(parser: painless_parser, ctx: ExpressionContext);
    noncondexpression(): NoncondexpressionContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class UnaryContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: UnaryContext): void;
}
export declare class NotaddsubContext extends UnaryContext {
    constructor(parser: painless_parser, ctx: UnaryContext);
    unarynotaddsub(): UnarynotaddsubContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class PreContext extends UnaryContext {
    constructor(parser: painless_parser, ctx: UnaryContext);
    chain(): ChainContext;
    INCR(): TerminalNode;
    DECR(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class AddsubContext extends UnaryContext {
    constructor(parser: painless_parser, ctx: UnaryContext);
    unary(): UnaryContext;
    ADD(): TerminalNode;
    SUB(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class UnarynotaddsubContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: UnarynotaddsubContext): void;
}
export declare class CastContext extends UnarynotaddsubContext {
    constructor(parser: painless_parser, ctx: UnarynotaddsubContext);
    castexpression(): CastexpressionContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class NotContext extends UnarynotaddsubContext {
    constructor(parser: painless_parser, ctx: UnarynotaddsubContext);
    unary(): UnaryContext;
    BOOLNOT(): TerminalNode;
    BWNOT(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ReadContext extends UnarynotaddsubContext {
    constructor(parser: painless_parser, ctx: UnarynotaddsubContext);
    chain(): ChainContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class PostContext extends UnarynotaddsubContext {
    constructor(parser: painless_parser, ctx: UnarynotaddsubContext);
    chain(): ChainContext;
    INCR(): TerminalNode;
    DECR(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class CastexpressionContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: CastexpressionContext): void;
}
export declare class RefcastContext extends CastexpressionContext {
    constructor(parser: painless_parser, ctx: CastexpressionContext);
    LP(): TerminalNode;
    refcasttype(): RefcasttypeContext;
    RP(): TerminalNode;
    unarynotaddsub(): UnarynotaddsubContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class PrimordefcastContext extends CastexpressionContext {
    constructor(parser: painless_parser, ctx: CastexpressionContext);
    LP(): TerminalNode;
    primordefcasttype(): PrimordefcasttypeContext;
    RP(): TerminalNode;
    unary(): UnaryContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class PrimordefcasttypeContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    DEF(): TerminalNode;
    PRIMITIVE(): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class RefcasttypeContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    DEF(): TerminalNode;
    LBRACE_list(): TerminalNode[];
    LBRACE(i: number): TerminalNode;
    RBRACE_list(): TerminalNode[];
    RBRACE(i: number): TerminalNode;
    PRIMITIVE(): TerminalNode;
    ID(): TerminalNode;
    DOT_list(): TerminalNode[];
    DOT(i: number): TerminalNode;
    DOTID_list(): TerminalNode[];
    DOTID(i: number): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ChainContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: ChainContext): void;
}
export declare class DynamicContext extends ChainContext {
    constructor(parser: painless_parser, ctx: ChainContext);
    primary(): PrimaryContext;
    postfix_list(): PostfixContext[];
    postfix(i: number): PostfixContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class NewarrayContext extends ChainContext {
    constructor(parser: painless_parser, ctx: ChainContext);
    arrayinitializer(): ArrayinitializerContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class PrimaryContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: PrimaryContext): void;
}
export declare class ListinitContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    listinitializer(): ListinitializerContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class RegexContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    REGEX(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class NullContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    NULL(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class StringContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    STRING(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class MapinitContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    mapinitializer(): MapinitializerContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class CalllocalContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    arguments(): ArgumentsContext;
    ID(): TerminalNode;
    DOLLAR(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class TrueContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    TRUE(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class FalseContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    FALSE(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class VariableContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    ID(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class NumericContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    OCTAL(): TerminalNode;
    HEX(): TerminalNode;
    INTEGER(): TerminalNode;
    DECIMAL(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class NewobjectContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    NEW(): TerminalNode;
    type_(): TypeContext;
    arguments(): ArgumentsContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class PrecedenceContext extends PrimaryContext {
    constructor(parser: painless_parser, ctx: PrimaryContext);
    LP(): TerminalNode;
    expression(): ExpressionContext;
    RP(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class PostfixContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    callinvoke(): CallinvokeContext;
    fieldaccess(): FieldaccessContext;
    braceaccess(): BraceaccessContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class PostdotContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    callinvoke(): CallinvokeContext;
    fieldaccess(): FieldaccessContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class CallinvokeContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    DOTID(): TerminalNode;
    arguments(): ArgumentsContext;
    DOT(): TerminalNode;
    NSDOT(): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class FieldaccessContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    DOT(): TerminalNode;
    NSDOT(): TerminalNode;
    DOTID(): TerminalNode;
    DOTINTEGER(): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class BraceaccessContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    LBRACE(): TerminalNode;
    expression(): ExpressionContext;
    RBRACE(): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ArrayinitializerContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: ArrayinitializerContext): void;
}
export declare class NewstandardarrayContext extends ArrayinitializerContext {
    constructor(parser: painless_parser, ctx: ArrayinitializerContext);
    NEW(): TerminalNode;
    type_(): TypeContext;
    LBRACE_list(): TerminalNode[];
    LBRACE(i: number): TerminalNode;
    expression_list(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    RBRACE_list(): TerminalNode[];
    RBRACE(i: number): TerminalNode;
    postdot(): PostdotContext;
    postfix_list(): PostfixContext[];
    postfix(i: number): PostfixContext;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class NewinitializedarrayContext extends ArrayinitializerContext {
    constructor(parser: painless_parser, ctx: ArrayinitializerContext);
    NEW(): TerminalNode;
    type_(): TypeContext;
    LBRACE(): TerminalNode;
    RBRACE(): TerminalNode;
    LBRACK(): TerminalNode;
    RBRACK(): TerminalNode;
    expression_list(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    postfix_list(): PostfixContext[];
    postfix(i: number): PostfixContext;
    COMMA_list(): TerminalNode[];
    COMMA(i: number): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ListinitializerContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    LBRACE(): TerminalNode;
    expression_list(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    RBRACE(): TerminalNode;
    COMMA_list(): TerminalNode[];
    COMMA(i: number): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class MapinitializerContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    LBRACE(): TerminalNode;
    maptoken_list(): MaptokenContext[];
    maptoken(i: number): MaptokenContext;
    RBRACE(): TerminalNode;
    COMMA_list(): TerminalNode[];
    COMMA(i: number): TerminalNode;
    COLON(): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class MaptokenContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    expression_list(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    COLON(): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ArgumentsContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    LP(): TerminalNode;
    RP(): TerminalNode;
    argument_list(): ArgumentContext[];
    argument(i: number): ArgumentContext;
    COMMA_list(): TerminalNode[];
    COMMA(i: number): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ArgumentContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    expression(): ExpressionContext;
    lambda(): LambdaContext;
    funcref(): FuncrefContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class LambdaContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    ARROW(): TerminalNode;
    lamtype_list(): LamtypeContext[];
    lamtype(i: number): LamtypeContext;
    LP(): TerminalNode;
    RP(): TerminalNode;
    block(): BlockContext;
    expression(): ExpressionContext;
    COMMA_list(): TerminalNode[];
    COMMA(i: number): TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class LamtypeContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    ID(): TerminalNode;
    decltype(): DecltypeContext;
    get ruleIndex(): number;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class FuncrefContext extends ParserRuleContext {
    constructor(parser?: painless_parser, parent?: ParserRuleContext, invokingState?: number);
    get ruleIndex(): number;
    copyFrom(ctx: FuncrefContext): void;
}
export declare class ClassfuncrefContext extends FuncrefContext {
    constructor(parser: painless_parser, ctx: FuncrefContext);
    decltype(): DecltypeContext;
    REF(): TerminalNode;
    ID(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class ConstructorfuncrefContext extends FuncrefContext {
    constructor(parser: painless_parser, ctx: FuncrefContext);
    decltype(): DecltypeContext;
    REF(): TerminalNode;
    NEW(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
export declare class LocalfuncrefContext extends FuncrefContext {
    constructor(parser: painless_parser, ctx: FuncrefContext);
    THIS(): TerminalNode;
    REF(): TerminalNode;
    ID(): TerminalNode;
    enterRule(listener: painless_parserListener): void;
    exitRule(listener: painless_parserListener): void;
}
