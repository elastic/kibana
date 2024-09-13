// @ts-nocheck
// Generated from ./src/painless/antlr/painless_parser.g4 by ANTLR 4.13.1

import {ParseTreeListener} from "antlr4";


import { SourceContext } from "./painless_parser";
import { FunctionContext } from "./painless_parser";
import { ParametersContext } from "./painless_parser";
import { StatementContext } from "./painless_parser";
import { IfContext } from "./painless_parser";
import { WhileContext } from "./painless_parser";
import { ForContext } from "./painless_parser";
import { EachContext } from "./painless_parser";
import { IneachContext } from "./painless_parser";
import { TryContext } from "./painless_parser";
import { DoContext } from "./painless_parser";
import { DeclContext } from "./painless_parser";
import { ContinueContext } from "./painless_parser";
import { BreakContext } from "./painless_parser";
import { ReturnContext } from "./painless_parser";
import { ThrowContext } from "./painless_parser";
import { ExprContext } from "./painless_parser";
import { TrailerContext } from "./painless_parser";
import { BlockContext } from "./painless_parser";
import { EmptyContext } from "./painless_parser";
import { InitializerContext } from "./painless_parser";
import { AfterthoughtContext } from "./painless_parser";
import { DeclarationContext } from "./painless_parser";
import { DecltypeContext } from "./painless_parser";
import { TypeContext } from "./painless_parser";
import { DeclvarContext } from "./painless_parser";
import { TrapContext } from "./painless_parser";
import { SingleContext } from "./painless_parser";
import { CompContext } from "./painless_parser";
import { BoolContext } from "./painless_parser";
import { BinaryContext } from "./painless_parser";
import { ElvisContext } from "./painless_parser";
import { InstanceofContext } from "./painless_parser";
import { NonconditionalContext } from "./painless_parser";
import { ConditionalContext } from "./painless_parser";
import { AssignmentContext } from "./painless_parser";
import { PreContext } from "./painless_parser";
import { AddsubContext } from "./painless_parser";
import { NotaddsubContext } from "./painless_parser";
import { ReadContext } from "./painless_parser";
import { PostContext } from "./painless_parser";
import { NotContext } from "./painless_parser";
import { CastContext } from "./painless_parser";
import { PrimordefcastContext } from "./painless_parser";
import { RefcastContext } from "./painless_parser";
import { PrimordefcasttypeContext } from "./painless_parser";
import { RefcasttypeContext } from "./painless_parser";
import { DynamicContext } from "./painless_parser";
import { NewarrayContext } from "./painless_parser";
import { PrecedenceContext } from "./painless_parser";
import { NumericContext } from "./painless_parser";
import { TrueContext } from "./painless_parser";
import { FalseContext } from "./painless_parser";
import { NullContext } from "./painless_parser";
import { StringContext } from "./painless_parser";
import { RegexContext } from "./painless_parser";
import { ListinitContext } from "./painless_parser";
import { MapinitContext } from "./painless_parser";
import { VariableContext } from "./painless_parser";
import { CalllocalContext } from "./painless_parser";
import { NewobjectContext } from "./painless_parser";
import { PostfixContext } from "./painless_parser";
import { PostdotContext } from "./painless_parser";
import { CallinvokeContext } from "./painless_parser";
import { FieldaccessContext } from "./painless_parser";
import { BraceaccessContext } from "./painless_parser";
import { NewstandardarrayContext } from "./painless_parser";
import { NewinitializedarrayContext } from "./painless_parser";
import { ListinitializerContext } from "./painless_parser";
import { MapinitializerContext } from "./painless_parser";
import { MaptokenContext } from "./painless_parser";
import { ArgumentsContext } from "./painless_parser";
import { ArgumentContext } from "./painless_parser";
import { LambdaContext } from "./painless_parser";
import { LamtypeContext } from "./painless_parser";
import { ClassfuncrefContext } from "./painless_parser";
import { ConstructorfuncrefContext } from "./painless_parser";
import { LocalfuncrefContext } from "./painless_parser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `painless_parser`.
 */
export default class painless_parserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `painless_parser.source`.
	 * @param ctx the parse tree
	 */
	enterSource?: (ctx: SourceContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.source`.
	 * @param ctx the parse tree
	 */
	exitSource?: (ctx: SourceContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.function`.
	 * @param ctx the parse tree
	 */
	enterFunction?: (ctx: FunctionContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.function`.
	 * @param ctx the parse tree
	 */
	exitFunction?: (ctx: FunctionContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.parameters`.
	 * @param ctx the parse tree
	 */
	enterParameters?: (ctx: ParametersContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.parameters`.
	 * @param ctx the parse tree
	 */
	exitParameters?: (ctx: ParametersContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.statement`.
	 * @param ctx the parse tree
	 */
	enterStatement?: (ctx: StatementContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.statement`.
	 * @param ctx the parse tree
	 */
	exitStatement?: (ctx: StatementContext) => void;
	/**
	 * Enter a parse tree produced by the `if`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterIf?: (ctx: IfContext) => void;
	/**
	 * Exit a parse tree produced by the `if`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitIf?: (ctx: IfContext) => void;
	/**
	 * Enter a parse tree produced by the `while`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterWhile?: (ctx: WhileContext) => void;
	/**
	 * Exit a parse tree produced by the `while`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitWhile?: (ctx: WhileContext) => void;
	/**
	 * Enter a parse tree produced by the `for`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterFor?: (ctx: ForContext) => void;
	/**
	 * Exit a parse tree produced by the `for`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitFor?: (ctx: ForContext) => void;
	/**
	 * Enter a parse tree produced by the `each`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterEach?: (ctx: EachContext) => void;
	/**
	 * Exit a parse tree produced by the `each`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitEach?: (ctx: EachContext) => void;
	/**
	 * Enter a parse tree produced by the `ineach`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterIneach?: (ctx: IneachContext) => void;
	/**
	 * Exit a parse tree produced by the `ineach`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitIneach?: (ctx: IneachContext) => void;
	/**
	 * Enter a parse tree produced by the `try`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterTry?: (ctx: TryContext) => void;
	/**
	 * Exit a parse tree produced by the `try`
	 * labeled alternative in `painless_parser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitTry?: (ctx: TryContext) => void;
	/**
	 * Enter a parse tree produced by the `do`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterDo?: (ctx: DoContext) => void;
	/**
	 * Exit a parse tree produced by the `do`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitDo?: (ctx: DoContext) => void;
	/**
	 * Enter a parse tree produced by the `decl`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterDecl?: (ctx: DeclContext) => void;
	/**
	 * Exit a parse tree produced by the `decl`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitDecl?: (ctx: DeclContext) => void;
	/**
	 * Enter a parse tree produced by the `continue`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterContinue?: (ctx: ContinueContext) => void;
	/**
	 * Exit a parse tree produced by the `continue`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitContinue?: (ctx: ContinueContext) => void;
	/**
	 * Enter a parse tree produced by the `break`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterBreak?: (ctx: BreakContext) => void;
	/**
	 * Exit a parse tree produced by the `break`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitBreak?: (ctx: BreakContext) => void;
	/**
	 * Enter a parse tree produced by the `return`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterReturn?: (ctx: ReturnContext) => void;
	/**
	 * Exit a parse tree produced by the `return`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitReturn?: (ctx: ReturnContext) => void;
	/**
	 * Enter a parse tree produced by the `throw`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterThrow?: (ctx: ThrowContext) => void;
	/**
	 * Exit a parse tree produced by the `throw`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitThrow?: (ctx: ThrowContext) => void;
	/**
	 * Enter a parse tree produced by the `expr`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterExpr?: (ctx: ExprContext) => void;
	/**
	 * Exit a parse tree produced by the `expr`
	 * labeled alternative in `painless_parser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitExpr?: (ctx: ExprContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.trailer`.
	 * @param ctx the parse tree
	 */
	enterTrailer?: (ctx: TrailerContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.trailer`.
	 * @param ctx the parse tree
	 */
	exitTrailer?: (ctx: TrailerContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.block`.
	 * @param ctx the parse tree
	 */
	enterBlock?: (ctx: BlockContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.block`.
	 * @param ctx the parse tree
	 */
	exitBlock?: (ctx: BlockContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.empty`.
	 * @param ctx the parse tree
	 */
	enterEmpty?: (ctx: EmptyContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.empty`.
	 * @param ctx the parse tree
	 */
	exitEmpty?: (ctx: EmptyContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.initializer`.
	 * @param ctx the parse tree
	 */
	enterInitializer?: (ctx: InitializerContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.initializer`.
	 * @param ctx the parse tree
	 */
	exitInitializer?: (ctx: InitializerContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.afterthought`.
	 * @param ctx the parse tree
	 */
	enterAfterthought?: (ctx: AfterthoughtContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.afterthought`.
	 * @param ctx the parse tree
	 */
	exitAfterthought?: (ctx: AfterthoughtContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.declaration`.
	 * @param ctx the parse tree
	 */
	enterDeclaration?: (ctx: DeclarationContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.declaration`.
	 * @param ctx the parse tree
	 */
	exitDeclaration?: (ctx: DeclarationContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.decltype`.
	 * @param ctx the parse tree
	 */
	enterDecltype?: (ctx: DecltypeContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.decltype`.
	 * @param ctx the parse tree
	 */
	exitDecltype?: (ctx: DecltypeContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.type`.
	 * @param ctx the parse tree
	 */
	enterType?: (ctx: TypeContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.type`.
	 * @param ctx the parse tree
	 */
	exitType?: (ctx: TypeContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.declvar`.
	 * @param ctx the parse tree
	 */
	enterDeclvar?: (ctx: DeclvarContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.declvar`.
	 * @param ctx the parse tree
	 */
	exitDeclvar?: (ctx: DeclvarContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.trap`.
	 * @param ctx the parse tree
	 */
	enterTrap?: (ctx: TrapContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.trap`.
	 * @param ctx the parse tree
	 */
	exitTrap?: (ctx: TrapContext) => void;
	/**
	 * Enter a parse tree produced by the `single`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterSingle?: (ctx: SingleContext) => void;
	/**
	 * Exit a parse tree produced by the `single`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitSingle?: (ctx: SingleContext) => void;
	/**
	 * Enter a parse tree produced by the `comp`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterComp?: (ctx: CompContext) => void;
	/**
	 * Exit a parse tree produced by the `comp`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitComp?: (ctx: CompContext) => void;
	/**
	 * Enter a parse tree produced by the `bool`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterBool?: (ctx: BoolContext) => void;
	/**
	 * Exit a parse tree produced by the `bool`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitBool?: (ctx: BoolContext) => void;
	/**
	 * Enter a parse tree produced by the `binary`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterBinary?: (ctx: BinaryContext) => void;
	/**
	 * Exit a parse tree produced by the `binary`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitBinary?: (ctx: BinaryContext) => void;
	/**
	 * Enter a parse tree produced by the `elvis`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterElvis?: (ctx: ElvisContext) => void;
	/**
	 * Exit a parse tree produced by the `elvis`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitElvis?: (ctx: ElvisContext) => void;
	/**
	 * Enter a parse tree produced by the `instanceof`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterInstanceof?: (ctx: InstanceofContext) => void;
	/**
	 * Exit a parse tree produced by the `instanceof`
	 * labeled alternative in `painless_parser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitInstanceof?: (ctx: InstanceofContext) => void;
	/**
	 * Enter a parse tree produced by the `nonconditional`
	 * labeled alternative in `painless_parser.expression`.
	 * @param ctx the parse tree
	 */
	enterNonconditional?: (ctx: NonconditionalContext) => void;
	/**
	 * Exit a parse tree produced by the `nonconditional`
	 * labeled alternative in `painless_parser.expression`.
	 * @param ctx the parse tree
	 */
	exitNonconditional?: (ctx: NonconditionalContext) => void;
	/**
	 * Enter a parse tree produced by the `conditional`
	 * labeled alternative in `painless_parser.expression`.
	 * @param ctx the parse tree
	 */
	enterConditional?: (ctx: ConditionalContext) => void;
	/**
	 * Exit a parse tree produced by the `conditional`
	 * labeled alternative in `painless_parser.expression`.
	 * @param ctx the parse tree
	 */
	exitConditional?: (ctx: ConditionalContext) => void;
	/**
	 * Enter a parse tree produced by the `assignment`
	 * labeled alternative in `painless_parser.expression`.
	 * @param ctx the parse tree
	 */
	enterAssignment?: (ctx: AssignmentContext) => void;
	/**
	 * Exit a parse tree produced by the `assignment`
	 * labeled alternative in `painless_parser.expression`.
	 * @param ctx the parse tree
	 */
	exitAssignment?: (ctx: AssignmentContext) => void;
	/**
	 * Enter a parse tree produced by the `pre`
	 * labeled alternative in `painless_parser.unary`.
	 * @param ctx the parse tree
	 */
	enterPre?: (ctx: PreContext) => void;
	/**
	 * Exit a parse tree produced by the `pre`
	 * labeled alternative in `painless_parser.unary`.
	 * @param ctx the parse tree
	 */
	exitPre?: (ctx: PreContext) => void;
	/**
	 * Enter a parse tree produced by the `addsub`
	 * labeled alternative in `painless_parser.unary`.
	 * @param ctx the parse tree
	 */
	enterAddsub?: (ctx: AddsubContext) => void;
	/**
	 * Exit a parse tree produced by the `addsub`
	 * labeled alternative in `painless_parser.unary`.
	 * @param ctx the parse tree
	 */
	exitAddsub?: (ctx: AddsubContext) => void;
	/**
	 * Enter a parse tree produced by the `notaddsub`
	 * labeled alternative in `painless_parser.unary`.
	 * @param ctx the parse tree
	 */
	enterNotaddsub?: (ctx: NotaddsubContext) => void;
	/**
	 * Exit a parse tree produced by the `notaddsub`
	 * labeled alternative in `painless_parser.unary`.
	 * @param ctx the parse tree
	 */
	exitNotaddsub?: (ctx: NotaddsubContext) => void;
	/**
	 * Enter a parse tree produced by the `read`
	 * labeled alternative in `painless_parser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterRead?: (ctx: ReadContext) => void;
	/**
	 * Exit a parse tree produced by the `read`
	 * labeled alternative in `painless_parser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitRead?: (ctx: ReadContext) => void;
	/**
	 * Enter a parse tree produced by the `post`
	 * labeled alternative in `painless_parser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterPost?: (ctx: PostContext) => void;
	/**
	 * Exit a parse tree produced by the `post`
	 * labeled alternative in `painless_parser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitPost?: (ctx: PostContext) => void;
	/**
	 * Enter a parse tree produced by the `not`
	 * labeled alternative in `painless_parser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterNot?: (ctx: NotContext) => void;
	/**
	 * Exit a parse tree produced by the `not`
	 * labeled alternative in `painless_parser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitNot?: (ctx: NotContext) => void;
	/**
	 * Enter a parse tree produced by the `cast`
	 * labeled alternative in `painless_parser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterCast?: (ctx: CastContext) => void;
	/**
	 * Exit a parse tree produced by the `cast`
	 * labeled alternative in `painless_parser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitCast?: (ctx: CastContext) => void;
	/**
	 * Enter a parse tree produced by the `primordefcast`
	 * labeled alternative in `painless_parser.castexpression`.
	 * @param ctx the parse tree
	 */
	enterPrimordefcast?: (ctx: PrimordefcastContext) => void;
	/**
	 * Exit a parse tree produced by the `primordefcast`
	 * labeled alternative in `painless_parser.castexpression`.
	 * @param ctx the parse tree
	 */
	exitPrimordefcast?: (ctx: PrimordefcastContext) => void;
	/**
	 * Enter a parse tree produced by the `refcast`
	 * labeled alternative in `painless_parser.castexpression`.
	 * @param ctx the parse tree
	 */
	enterRefcast?: (ctx: RefcastContext) => void;
	/**
	 * Exit a parse tree produced by the `refcast`
	 * labeled alternative in `painless_parser.castexpression`.
	 * @param ctx the parse tree
	 */
	exitRefcast?: (ctx: RefcastContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.primordefcasttype`.
	 * @param ctx the parse tree
	 */
	enterPrimordefcasttype?: (ctx: PrimordefcasttypeContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.primordefcasttype`.
	 * @param ctx the parse tree
	 */
	exitPrimordefcasttype?: (ctx: PrimordefcasttypeContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.refcasttype`.
	 * @param ctx the parse tree
	 */
	enterRefcasttype?: (ctx: RefcasttypeContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.refcasttype`.
	 * @param ctx the parse tree
	 */
	exitRefcasttype?: (ctx: RefcasttypeContext) => void;
	/**
	 * Enter a parse tree produced by the `dynamic`
	 * labeled alternative in `painless_parser.chain`.
	 * @param ctx the parse tree
	 */
	enterDynamic?: (ctx: DynamicContext) => void;
	/**
	 * Exit a parse tree produced by the `dynamic`
	 * labeled alternative in `painless_parser.chain`.
	 * @param ctx the parse tree
	 */
	exitDynamic?: (ctx: DynamicContext) => void;
	/**
	 * Enter a parse tree produced by the `newarray`
	 * labeled alternative in `painless_parser.chain`.
	 * @param ctx the parse tree
	 */
	enterNewarray?: (ctx: NewarrayContext) => void;
	/**
	 * Exit a parse tree produced by the `newarray`
	 * labeled alternative in `painless_parser.chain`.
	 * @param ctx the parse tree
	 */
	exitNewarray?: (ctx: NewarrayContext) => void;
	/**
	 * Enter a parse tree produced by the `precedence`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterPrecedence?: (ctx: PrecedenceContext) => void;
	/**
	 * Exit a parse tree produced by the `precedence`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitPrecedence?: (ctx: PrecedenceContext) => void;
	/**
	 * Enter a parse tree produced by the `numeric`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterNumeric?: (ctx: NumericContext) => void;
	/**
	 * Exit a parse tree produced by the `numeric`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitNumeric?: (ctx: NumericContext) => void;
	/**
	 * Enter a parse tree produced by the `true`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterTrue?: (ctx: TrueContext) => void;
	/**
	 * Exit a parse tree produced by the `true`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitTrue?: (ctx: TrueContext) => void;
	/**
	 * Enter a parse tree produced by the `false`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterFalse?: (ctx: FalseContext) => void;
	/**
	 * Exit a parse tree produced by the `false`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitFalse?: (ctx: FalseContext) => void;
	/**
	 * Enter a parse tree produced by the `null`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterNull?: (ctx: NullContext) => void;
	/**
	 * Exit a parse tree produced by the `null`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitNull?: (ctx: NullContext) => void;
	/**
	 * Enter a parse tree produced by the `string`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterString?: (ctx: StringContext) => void;
	/**
	 * Exit a parse tree produced by the `string`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitString?: (ctx: StringContext) => void;
	/**
	 * Enter a parse tree produced by the `regex`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterRegex?: (ctx: RegexContext) => void;
	/**
	 * Exit a parse tree produced by the `regex`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitRegex?: (ctx: RegexContext) => void;
	/**
	 * Enter a parse tree produced by the `listinit`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterListinit?: (ctx: ListinitContext) => void;
	/**
	 * Exit a parse tree produced by the `listinit`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitListinit?: (ctx: ListinitContext) => void;
	/**
	 * Enter a parse tree produced by the `mapinit`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterMapinit?: (ctx: MapinitContext) => void;
	/**
	 * Exit a parse tree produced by the `mapinit`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitMapinit?: (ctx: MapinitContext) => void;
	/**
	 * Enter a parse tree produced by the `variable`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterVariable?: (ctx: VariableContext) => void;
	/**
	 * Exit a parse tree produced by the `variable`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitVariable?: (ctx: VariableContext) => void;
	/**
	 * Enter a parse tree produced by the `calllocal`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterCalllocal?: (ctx: CalllocalContext) => void;
	/**
	 * Exit a parse tree produced by the `calllocal`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitCalllocal?: (ctx: CalllocalContext) => void;
	/**
	 * Enter a parse tree produced by the `newobject`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	enterNewobject?: (ctx: NewobjectContext) => void;
	/**
	 * Exit a parse tree produced by the `newobject`
	 * labeled alternative in `painless_parser.primary`.
	 * @param ctx the parse tree
	 */
	exitNewobject?: (ctx: NewobjectContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.postfix`.
	 * @param ctx the parse tree
	 */
	enterPostfix?: (ctx: PostfixContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.postfix`.
	 * @param ctx the parse tree
	 */
	exitPostfix?: (ctx: PostfixContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.postdot`.
	 * @param ctx the parse tree
	 */
	enterPostdot?: (ctx: PostdotContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.postdot`.
	 * @param ctx the parse tree
	 */
	exitPostdot?: (ctx: PostdotContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.callinvoke`.
	 * @param ctx the parse tree
	 */
	enterCallinvoke?: (ctx: CallinvokeContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.callinvoke`.
	 * @param ctx the parse tree
	 */
	exitCallinvoke?: (ctx: CallinvokeContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.fieldaccess`.
	 * @param ctx the parse tree
	 */
	enterFieldaccess?: (ctx: FieldaccessContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.fieldaccess`.
	 * @param ctx the parse tree
	 */
	exitFieldaccess?: (ctx: FieldaccessContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.braceaccess`.
	 * @param ctx the parse tree
	 */
	enterBraceaccess?: (ctx: BraceaccessContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.braceaccess`.
	 * @param ctx the parse tree
	 */
	exitBraceaccess?: (ctx: BraceaccessContext) => void;
	/**
	 * Enter a parse tree produced by the `newstandardarray`
	 * labeled alternative in `painless_parser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	enterNewstandardarray?: (ctx: NewstandardarrayContext) => void;
	/**
	 * Exit a parse tree produced by the `newstandardarray`
	 * labeled alternative in `painless_parser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	exitNewstandardarray?: (ctx: NewstandardarrayContext) => void;
	/**
	 * Enter a parse tree produced by the `newinitializedarray`
	 * labeled alternative in `painless_parser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	enterNewinitializedarray?: (ctx: NewinitializedarrayContext) => void;
	/**
	 * Exit a parse tree produced by the `newinitializedarray`
	 * labeled alternative in `painless_parser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	exitNewinitializedarray?: (ctx: NewinitializedarrayContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.listinitializer`.
	 * @param ctx the parse tree
	 */
	enterListinitializer?: (ctx: ListinitializerContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.listinitializer`.
	 * @param ctx the parse tree
	 */
	exitListinitializer?: (ctx: ListinitializerContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.mapinitializer`.
	 * @param ctx the parse tree
	 */
	enterMapinitializer?: (ctx: MapinitializerContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.mapinitializer`.
	 * @param ctx the parse tree
	 */
	exitMapinitializer?: (ctx: MapinitializerContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.maptoken`.
	 * @param ctx the parse tree
	 */
	enterMaptoken?: (ctx: MaptokenContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.maptoken`.
	 * @param ctx the parse tree
	 */
	exitMaptoken?: (ctx: MaptokenContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.arguments`.
	 * @param ctx the parse tree
	 */
	enterArguments?: (ctx: ArgumentsContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.arguments`.
	 * @param ctx the parse tree
	 */
	exitArguments?: (ctx: ArgumentsContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.argument`.
	 * @param ctx the parse tree
	 */
	enterArgument?: (ctx: ArgumentContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.argument`.
	 * @param ctx the parse tree
	 */
	exitArgument?: (ctx: ArgumentContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.lambda`.
	 * @param ctx the parse tree
	 */
	enterLambda?: (ctx: LambdaContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.lambda`.
	 * @param ctx the parse tree
	 */
	exitLambda?: (ctx: LambdaContext) => void;
	/**
	 * Enter a parse tree produced by `painless_parser.lamtype`.
	 * @param ctx the parse tree
	 */
	enterLamtype?: (ctx: LamtypeContext) => void;
	/**
	 * Exit a parse tree produced by `painless_parser.lamtype`.
	 * @param ctx the parse tree
	 */
	exitLamtype?: (ctx: LamtypeContext) => void;
	/**
	 * Enter a parse tree produced by the `classfuncref`
	 * labeled alternative in `painless_parser.funcref`.
	 * @param ctx the parse tree
	 */
	enterClassfuncref?: (ctx: ClassfuncrefContext) => void;
	/**
	 * Exit a parse tree produced by the `classfuncref`
	 * labeled alternative in `painless_parser.funcref`.
	 * @param ctx the parse tree
	 */
	exitClassfuncref?: (ctx: ClassfuncrefContext) => void;
	/**
	 * Enter a parse tree produced by the `constructorfuncref`
	 * labeled alternative in `painless_parser.funcref`.
	 * @param ctx the parse tree
	 */
	enterConstructorfuncref?: (ctx: ConstructorfuncrefContext) => void;
	/**
	 * Exit a parse tree produced by the `constructorfuncref`
	 * labeled alternative in `painless_parser.funcref`.
	 * @param ctx the parse tree
	 */
	exitConstructorfuncref?: (ctx: ConstructorfuncrefContext) => void;
	/**
	 * Enter a parse tree produced by the `localfuncref`
	 * labeled alternative in `painless_parser.funcref`.
	 * @param ctx the parse tree
	 */
	enterLocalfuncref?: (ctx: LocalfuncrefContext) => void;
	/**
	 * Exit a parse tree produced by the `localfuncref`
	 * labeled alternative in `painless_parser.funcref`.
	 * @param ctx the parse tree
	 */
	exitLocalfuncref?: (ctx: LocalfuncrefContext) => void;
}

