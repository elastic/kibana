// @ts-nocheck
// Generated from ./PainlessParser.g4 by ANTLR 4.7.3-SNAPSHOT


import { ParseTreeListener } from "antlr4ts/tree/ParseTreeListener";

import { NewstandardarrayContext } from "./PainlessParser";
import { NewinitializedarrayContext } from "./PainlessParser";
import { PrimordefcastContext } from "./PainlessParser";
import { RefcastContext } from "./PainlessParser";
import { PreContext } from "./PainlessParser";
import { AddsubContext } from "./PainlessParser";
import { NotaddsubContext } from "./PainlessParser";
import { ClassfuncrefContext } from "./PainlessParser";
import { ConstructorfuncrefContext } from "./PainlessParser";
import { LocalfuncrefContext } from "./PainlessParser";
import { IfContext } from "./PainlessParser";
import { WhileContext } from "./PainlessParser";
import { ForContext } from "./PainlessParser";
import { EachContext } from "./PainlessParser";
import { IneachContext } from "./PainlessParser";
import { TryContext } from "./PainlessParser";
import { ReadContext } from "./PainlessParser";
import { PostContext } from "./PainlessParser";
import { NotContext } from "./PainlessParser";
import { CastContext } from "./PainlessParser";
import { DynamicContext } from "./PainlessParser";
import { NewarrayContext } from "./PainlessParser";
import { NonconditionalContext } from "./PainlessParser";
import { ConditionalContext } from "./PainlessParser";
import { AssignmentContext } from "./PainlessParser";
import { DoContext } from "./PainlessParser";
import { DeclContext } from "./PainlessParser";
import { ContinueContext } from "./PainlessParser";
import { BreakContext } from "./PainlessParser";
import { ReturnContext } from "./PainlessParser";
import { ThrowContext } from "./PainlessParser";
import { ExprContext } from "./PainlessParser";
import { SingleContext } from "./PainlessParser";
import { BinaryContext } from "./PainlessParser";
import { CompContext } from "./PainlessParser";
import { InstanceofContext } from "./PainlessParser";
import { BoolContext } from "./PainlessParser";
import { ElvisContext } from "./PainlessParser";
import { PrecedenceContext } from "./PainlessParser";
import { NumericContext } from "./PainlessParser";
import { TrueContext } from "./PainlessParser";
import { FalseContext } from "./PainlessParser";
import { NullContext } from "./PainlessParser";
import { StringContext } from "./PainlessParser";
import { RegexContext } from "./PainlessParser";
import { ListinitContext } from "./PainlessParser";
import { MapinitContext } from "./PainlessParser";
import { VariableContext } from "./PainlessParser";
import { CalllocalContext } from "./PainlessParser";
import { NewobjectContext } from "./PainlessParser";
import { SourceContext } from "./PainlessParser";
import { FunctionContext } from "./PainlessParser";
import { ParametersContext } from "./PainlessParser";
import { StatementContext } from "./PainlessParser";
import { RstatementContext } from "./PainlessParser";
import { DstatementContext } from "./PainlessParser";
import { TrailerContext } from "./PainlessParser";
import { BlockContext } from "./PainlessParser";
import { EmptyContext } from "./PainlessParser";
import { InitializerContext } from "./PainlessParser";
import { AfterthoughtContext } from "./PainlessParser";
import { DeclarationContext } from "./PainlessParser";
import { DecltypeContext } from "./PainlessParser";
import { TypeContext } from "./PainlessParser";
import { DeclvarContext } from "./PainlessParser";
import { TrapContext } from "./PainlessParser";
import { NoncondexpressionContext } from "./PainlessParser";
import { ExpressionContext } from "./PainlessParser";
import { UnaryContext } from "./PainlessParser";
import { UnarynotaddsubContext } from "./PainlessParser";
import { CastexpressionContext } from "./PainlessParser";
import { PrimordefcasttypeContext } from "./PainlessParser";
import { RefcasttypeContext } from "./PainlessParser";
import { ChainContext } from "./PainlessParser";
import { PrimaryContext } from "./PainlessParser";
import { PostfixContext } from "./PainlessParser";
import { PostdotContext } from "./PainlessParser";
import { CallinvokeContext } from "./PainlessParser";
import { FieldaccessContext } from "./PainlessParser";
import { BraceaccessContext } from "./PainlessParser";
import { ArrayinitializerContext } from "./PainlessParser";
import { ListinitializerContext } from "./PainlessParser";
import { MapinitializerContext } from "./PainlessParser";
import { MaptokenContext } from "./PainlessParser";
import { ArgumentsContext } from "./PainlessParser";
import { ArgumentContext } from "./PainlessParser";
import { LambdaContext } from "./PainlessParser";
import { LamtypeContext } from "./PainlessParser";
import { FuncrefContext } from "./PainlessParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `PainlessParser`.
 */
export interface PainlessParserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by the `newstandardarray`
	 * labeled alternative in `PainlessParser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	enterNewstandardarray?: (ctx: NewstandardarrayContext) => void;
	/**
	 * Exit a parse tree produced by the `newstandardarray`
	 * labeled alternative in `PainlessParser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	exitNewstandardarray?: (ctx: NewstandardarrayContext) => void;

	/**
	 * Enter a parse tree produced by the `newinitializedarray`
	 * labeled alternative in `PainlessParser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	enterNewinitializedarray?: (ctx: NewinitializedarrayContext) => void;
	/**
	 * Exit a parse tree produced by the `newinitializedarray`
	 * labeled alternative in `PainlessParser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	exitNewinitializedarray?: (ctx: NewinitializedarrayContext) => void;

	/**
	 * Enter a parse tree produced by the `primordefcast`
	 * labeled alternative in `PainlessParser.castexpression`.
	 * @param ctx the parse tree
	 */
	enterPrimordefcast?: (ctx: PrimordefcastContext) => void;
	/**
	 * Exit a parse tree produced by the `primordefcast`
	 * labeled alternative in `PainlessParser.castexpression`.
	 * @param ctx the parse tree
	 */
	exitPrimordefcast?: (ctx: PrimordefcastContext) => void;

	/**
	 * Enter a parse tree produced by the `refcast`
	 * labeled alternative in `PainlessParser.castexpression`.
	 * @param ctx the parse tree
	 */
	enterRefcast?: (ctx: RefcastContext) => void;
	/**
	 * Exit a parse tree produced by the `refcast`
	 * labeled alternative in `PainlessParser.castexpression`.
	 * @param ctx the parse tree
	 */
	exitRefcast?: (ctx: RefcastContext) => void;

	/**
	 * Enter a parse tree produced by the `pre`
	 * labeled alternative in `PainlessParser.unary`.
	 * @param ctx the parse tree
	 */
	enterPre?: (ctx: PreContext) => void;
	/**
	 * Exit a parse tree produced by the `pre`
	 * labeled alternative in `PainlessParser.unary`.
	 * @param ctx the parse tree
	 */
	exitPre?: (ctx: PreContext) => void;

	/**
	 * Enter a parse tree produced by the `addsub`
	 * labeled alternative in `PainlessParser.unary`.
	 * @param ctx the parse tree
	 */
	enterAddsub?: (ctx: AddsubContext) => void;
	/**
	 * Exit a parse tree produced by the `addsub`
	 * labeled alternative in `PainlessParser.unary`.
	 * @param ctx the parse tree
	 */
	exitAddsub?: (ctx: AddsubContext) => void;

	/**
	 * Enter a parse tree produced by the `notaddsub`
	 * labeled alternative in `PainlessParser.unary`.
	 * @param ctx the parse tree
	 */
	enterNotaddsub?: (ctx: NotaddsubContext) => void;
	/**
	 * Exit a parse tree produced by the `notaddsub`
	 * labeled alternative in `PainlessParser.unary`.
	 * @param ctx the parse tree
	 */
	exitNotaddsub?: (ctx: NotaddsubContext) => void;

	/**
	 * Enter a parse tree produced by the `classfuncref`
	 * labeled alternative in `PainlessParser.funcref`.
	 * @param ctx the parse tree
	 */
	enterClassfuncref?: (ctx: ClassfuncrefContext) => void;
	/**
	 * Exit a parse tree produced by the `classfuncref`
	 * labeled alternative in `PainlessParser.funcref`.
	 * @param ctx the parse tree
	 */
	exitClassfuncref?: (ctx: ClassfuncrefContext) => void;

	/**
	 * Enter a parse tree produced by the `constructorfuncref`
	 * labeled alternative in `PainlessParser.funcref`.
	 * @param ctx the parse tree
	 */
	enterConstructorfuncref?: (ctx: ConstructorfuncrefContext) => void;
	/**
	 * Exit a parse tree produced by the `constructorfuncref`
	 * labeled alternative in `PainlessParser.funcref`.
	 * @param ctx the parse tree
	 */
	exitConstructorfuncref?: (ctx: ConstructorfuncrefContext) => void;

	/**
	 * Enter a parse tree produced by the `localfuncref`
	 * labeled alternative in `PainlessParser.funcref`.
	 * @param ctx the parse tree
	 */
	enterLocalfuncref?: (ctx: LocalfuncrefContext) => void;
	/**
	 * Exit a parse tree produced by the `localfuncref`
	 * labeled alternative in `PainlessParser.funcref`.
	 * @param ctx the parse tree
	 */
	exitLocalfuncref?: (ctx: LocalfuncrefContext) => void;

	/**
	 * Enter a parse tree produced by the `if`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterIf?: (ctx: IfContext) => void;
	/**
	 * Exit a parse tree produced by the `if`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitIf?: (ctx: IfContext) => void;

	/**
	 * Enter a parse tree produced by the `while`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterWhile?: (ctx: WhileContext) => void;
	/**
	 * Exit a parse tree produced by the `while`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitWhile?: (ctx: WhileContext) => void;

	/**
	 * Enter a parse tree produced by the `for`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterFor?: (ctx: ForContext) => void;
	/**
	 * Exit a parse tree produced by the `for`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitFor?: (ctx: ForContext) => void;

	/**
	 * Enter a parse tree produced by the `each`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterEach?: (ctx: EachContext) => void;
	/**
	 * Exit a parse tree produced by the `each`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitEach?: (ctx: EachContext) => void;

	/**
	 * Enter a parse tree produced by the `ineach`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterIneach?: (ctx: IneachContext) => void;
	/**
	 * Exit a parse tree produced by the `ineach`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitIneach?: (ctx: IneachContext) => void;

	/**
	 * Enter a parse tree produced by the `try`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterTry?: (ctx: TryContext) => void;
	/**
	 * Exit a parse tree produced by the `try`
	 * labeled alternative in `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitTry?: (ctx: TryContext) => void;

	/**
	 * Enter a parse tree produced by the `read`
	 * labeled alternative in `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterRead?: (ctx: ReadContext) => void;
	/**
	 * Exit a parse tree produced by the `read`
	 * labeled alternative in `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitRead?: (ctx: ReadContext) => void;

	/**
	 * Enter a parse tree produced by the `post`
	 * labeled alternative in `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterPost?: (ctx: PostContext) => void;
	/**
	 * Exit a parse tree produced by the `post`
	 * labeled alternative in `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitPost?: (ctx: PostContext) => void;

	/**
	 * Enter a parse tree produced by the `not`
	 * labeled alternative in `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterNot?: (ctx: NotContext) => void;
	/**
	 * Exit a parse tree produced by the `not`
	 * labeled alternative in `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitNot?: (ctx: NotContext) => void;

	/**
	 * Enter a parse tree produced by the `cast`
	 * labeled alternative in `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterCast?: (ctx: CastContext) => void;
	/**
	 * Exit a parse tree produced by the `cast`
	 * labeled alternative in `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitCast?: (ctx: CastContext) => void;

	/**
	 * Enter a parse tree produced by the `dynamic`
	 * labeled alternative in `PainlessParser.chain`.
	 * @param ctx the parse tree
	 */
	enterDynamic?: (ctx: DynamicContext) => void;
	/**
	 * Exit a parse tree produced by the `dynamic`
	 * labeled alternative in `PainlessParser.chain`.
	 * @param ctx the parse tree
	 */
	exitDynamic?: (ctx: DynamicContext) => void;

	/**
	 * Enter a parse tree produced by the `newarray`
	 * labeled alternative in `PainlessParser.chain`.
	 * @param ctx the parse tree
	 */
	enterNewarray?: (ctx: NewarrayContext) => void;
	/**
	 * Exit a parse tree produced by the `newarray`
	 * labeled alternative in `PainlessParser.chain`.
	 * @param ctx the parse tree
	 */
	exitNewarray?: (ctx: NewarrayContext) => void;

	/**
	 * Enter a parse tree produced by the `nonconditional`
	 * labeled alternative in `PainlessParser.expression`.
	 * @param ctx the parse tree
	 */
	enterNonconditional?: (ctx: NonconditionalContext) => void;
	/**
	 * Exit a parse tree produced by the `nonconditional`
	 * labeled alternative in `PainlessParser.expression`.
	 * @param ctx the parse tree
	 */
	exitNonconditional?: (ctx: NonconditionalContext) => void;

	/**
	 * Enter a parse tree produced by the `conditional`
	 * labeled alternative in `PainlessParser.expression`.
	 * @param ctx the parse tree
	 */
	enterConditional?: (ctx: ConditionalContext) => void;
	/**
	 * Exit a parse tree produced by the `conditional`
	 * labeled alternative in `PainlessParser.expression`.
	 * @param ctx the parse tree
	 */
	exitConditional?: (ctx: ConditionalContext) => void;

	/**
	 * Enter a parse tree produced by the `assignment`
	 * labeled alternative in `PainlessParser.expression`.
	 * @param ctx the parse tree
	 */
	enterAssignment?: (ctx: AssignmentContext) => void;
	/**
	 * Exit a parse tree produced by the `assignment`
	 * labeled alternative in `PainlessParser.expression`.
	 * @param ctx the parse tree
	 */
	exitAssignment?: (ctx: AssignmentContext) => void;

	/**
	 * Enter a parse tree produced by the `do`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterDo?: (ctx: DoContext) => void;
	/**
	 * Exit a parse tree produced by the `do`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitDo?: (ctx: DoContext) => void;

	/**
	 * Enter a parse tree produced by the `decl`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterDecl?: (ctx: DeclContext) => void;
	/**
	 * Exit a parse tree produced by the `decl`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitDecl?: (ctx: DeclContext) => void;

	/**
	 * Enter a parse tree produced by the `continue`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterContinue?: (ctx: ContinueContext) => void;
	/**
	 * Exit a parse tree produced by the `continue`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitContinue?: (ctx: ContinueContext) => void;

	/**
	 * Enter a parse tree produced by the `break`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterBreak?: (ctx: BreakContext) => void;
	/**
	 * Exit a parse tree produced by the `break`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitBreak?: (ctx: BreakContext) => void;

	/**
	 * Enter a parse tree produced by the `return`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterReturn?: (ctx: ReturnContext) => void;
	/**
	 * Exit a parse tree produced by the `return`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitReturn?: (ctx: ReturnContext) => void;

	/**
	 * Enter a parse tree produced by the `throw`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterThrow?: (ctx: ThrowContext) => void;
	/**
	 * Exit a parse tree produced by the `throw`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitThrow?: (ctx: ThrowContext) => void;

	/**
	 * Enter a parse tree produced by the `expr`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterExpr?: (ctx: ExprContext) => void;
	/**
	 * Exit a parse tree produced by the `expr`
	 * labeled alternative in `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitExpr?: (ctx: ExprContext) => void;

	/**
	 * Enter a parse tree produced by the `single`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterSingle?: (ctx: SingleContext) => void;
	/**
	 * Exit a parse tree produced by the `single`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitSingle?: (ctx: SingleContext) => void;

	/**
	 * Enter a parse tree produced by the `binary`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterBinary?: (ctx: BinaryContext) => void;
	/**
	 * Exit a parse tree produced by the `binary`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitBinary?: (ctx: BinaryContext) => void;

	/**
	 * Enter a parse tree produced by the `comp`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterComp?: (ctx: CompContext) => void;
	/**
	 * Exit a parse tree produced by the `comp`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitComp?: (ctx: CompContext) => void;

	/**
	 * Enter a parse tree produced by the `instanceof`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterInstanceof?: (ctx: InstanceofContext) => void;
	/**
	 * Exit a parse tree produced by the `instanceof`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitInstanceof?: (ctx: InstanceofContext) => void;

	/**
	 * Enter a parse tree produced by the `bool`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterBool?: (ctx: BoolContext) => void;
	/**
	 * Exit a parse tree produced by the `bool`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitBool?: (ctx: BoolContext) => void;

	/**
	 * Enter a parse tree produced by the `elvis`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterElvis?: (ctx: ElvisContext) => void;
	/**
	 * Exit a parse tree produced by the `elvis`
	 * labeled alternative in `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitElvis?: (ctx: ElvisContext) => void;

	/**
	 * Enter a parse tree produced by the `precedence`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterPrecedence?: (ctx: PrecedenceContext) => void;
	/**
	 * Exit a parse tree produced by the `precedence`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitPrecedence?: (ctx: PrecedenceContext) => void;

	/**
	 * Enter a parse tree produced by the `numeric`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterNumeric?: (ctx: NumericContext) => void;
	/**
	 * Exit a parse tree produced by the `numeric`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitNumeric?: (ctx: NumericContext) => void;

	/**
	 * Enter a parse tree produced by the `true`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterTrue?: (ctx: TrueContext) => void;
	/**
	 * Exit a parse tree produced by the `true`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitTrue?: (ctx: TrueContext) => void;

	/**
	 * Enter a parse tree produced by the `false`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterFalse?: (ctx: FalseContext) => void;
	/**
	 * Exit a parse tree produced by the `false`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitFalse?: (ctx: FalseContext) => void;

	/**
	 * Enter a parse tree produced by the `null`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterNull?: (ctx: NullContext) => void;
	/**
	 * Exit a parse tree produced by the `null`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitNull?: (ctx: NullContext) => void;

	/**
	 * Enter a parse tree produced by the `string`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterString?: (ctx: StringContext) => void;
	/**
	 * Exit a parse tree produced by the `string`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitString?: (ctx: StringContext) => void;

	/**
	 * Enter a parse tree produced by the `regex`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterRegex?: (ctx: RegexContext) => void;
	/**
	 * Exit a parse tree produced by the `regex`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitRegex?: (ctx: RegexContext) => void;

	/**
	 * Enter a parse tree produced by the `listinit`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterListinit?: (ctx: ListinitContext) => void;
	/**
	 * Exit a parse tree produced by the `listinit`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitListinit?: (ctx: ListinitContext) => void;

	/**
	 * Enter a parse tree produced by the `mapinit`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterMapinit?: (ctx: MapinitContext) => void;
	/**
	 * Exit a parse tree produced by the `mapinit`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitMapinit?: (ctx: MapinitContext) => void;

	/**
	 * Enter a parse tree produced by the `variable`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterVariable?: (ctx: VariableContext) => void;
	/**
	 * Exit a parse tree produced by the `variable`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitVariable?: (ctx: VariableContext) => void;

	/**
	 * Enter a parse tree produced by the `calllocal`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterCalllocal?: (ctx: CalllocalContext) => void;
	/**
	 * Exit a parse tree produced by the `calllocal`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitCalllocal?: (ctx: CalllocalContext) => void;

	/**
	 * Enter a parse tree produced by the `newobject`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterNewobject?: (ctx: NewobjectContext) => void;
	/**
	 * Exit a parse tree produced by the `newobject`
	 * labeled alternative in `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitNewobject?: (ctx: NewobjectContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.source`.
	 * @param ctx the parse tree
	 */
	enterSource?: (ctx: SourceContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.source`.
	 * @param ctx the parse tree
	 */
	exitSource?: (ctx: SourceContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.function`.
	 * @param ctx the parse tree
	 */
	enterFunction?: (ctx: FunctionContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.function`.
	 * @param ctx the parse tree
	 */
	exitFunction?: (ctx: FunctionContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.parameters`.
	 * @param ctx the parse tree
	 */
	enterParameters?: (ctx: ParametersContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.parameters`.
	 * @param ctx the parse tree
	 */
	exitParameters?: (ctx: ParametersContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.statement`.
	 * @param ctx the parse tree
	 */
	enterStatement?: (ctx: StatementContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.statement`.
	 * @param ctx the parse tree
	 */
	exitStatement?: (ctx: StatementContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	enterRstatement?: (ctx: RstatementContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.rstatement`.
	 * @param ctx the parse tree
	 */
	exitRstatement?: (ctx: RstatementContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	enterDstatement?: (ctx: DstatementContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.dstatement`.
	 * @param ctx the parse tree
	 */
	exitDstatement?: (ctx: DstatementContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.trailer`.
	 * @param ctx the parse tree
	 */
	enterTrailer?: (ctx: TrailerContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.trailer`.
	 * @param ctx the parse tree
	 */
	exitTrailer?: (ctx: TrailerContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.block`.
	 * @param ctx the parse tree
	 */
	enterBlock?: (ctx: BlockContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.block`.
	 * @param ctx the parse tree
	 */
	exitBlock?: (ctx: BlockContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.empty`.
	 * @param ctx the parse tree
	 */
	enterEmpty?: (ctx: EmptyContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.empty`.
	 * @param ctx the parse tree
	 */
	exitEmpty?: (ctx: EmptyContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.initializer`.
	 * @param ctx the parse tree
	 */
	enterInitializer?: (ctx: InitializerContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.initializer`.
	 * @param ctx the parse tree
	 */
	exitInitializer?: (ctx: InitializerContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.afterthought`.
	 * @param ctx the parse tree
	 */
	enterAfterthought?: (ctx: AfterthoughtContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.afterthought`.
	 * @param ctx the parse tree
	 */
	exitAfterthought?: (ctx: AfterthoughtContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.declaration`.
	 * @param ctx the parse tree
	 */
	enterDeclaration?: (ctx: DeclarationContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.declaration`.
	 * @param ctx the parse tree
	 */
	exitDeclaration?: (ctx: DeclarationContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.decltype`.
	 * @param ctx the parse tree
	 */
	enterDecltype?: (ctx: DecltypeContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.decltype`.
	 * @param ctx the parse tree
	 */
	exitDecltype?: (ctx: DecltypeContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.type`.
	 * @param ctx the parse tree
	 */
	enterType?: (ctx: TypeContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.type`.
	 * @param ctx the parse tree
	 */
	exitType?: (ctx: TypeContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.declvar`.
	 * @param ctx the parse tree
	 */
	enterDeclvar?: (ctx: DeclvarContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.declvar`.
	 * @param ctx the parse tree
	 */
	exitDeclvar?: (ctx: DeclvarContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.trap`.
	 * @param ctx the parse tree
	 */
	enterTrap?: (ctx: TrapContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.trap`.
	 * @param ctx the parse tree
	 */
	exitTrap?: (ctx: TrapContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	enterNoncondexpression?: (ctx: NoncondexpressionContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.noncondexpression`.
	 * @param ctx the parse tree
	 */
	exitNoncondexpression?: (ctx: NoncondexpressionContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression?: (ctx: ExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression?: (ctx: ExpressionContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.unary`.
	 * @param ctx the parse tree
	 */
	enterUnary?: (ctx: UnaryContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.unary`.
	 * @param ctx the parse tree
	 */
	exitUnary?: (ctx: UnaryContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	enterUnarynotaddsub?: (ctx: UnarynotaddsubContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.unarynotaddsub`.
	 * @param ctx the parse tree
	 */
	exitUnarynotaddsub?: (ctx: UnarynotaddsubContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.castexpression`.
	 * @param ctx the parse tree
	 */
	enterCastexpression?: (ctx: CastexpressionContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.castexpression`.
	 * @param ctx the parse tree
	 */
	exitCastexpression?: (ctx: CastexpressionContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.primordefcasttype`.
	 * @param ctx the parse tree
	 */
	enterPrimordefcasttype?: (ctx: PrimordefcasttypeContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.primordefcasttype`.
	 * @param ctx the parse tree
	 */
	exitPrimordefcasttype?: (ctx: PrimordefcasttypeContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.refcasttype`.
	 * @param ctx the parse tree
	 */
	enterRefcasttype?: (ctx: RefcasttypeContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.refcasttype`.
	 * @param ctx the parse tree
	 */
	exitRefcasttype?: (ctx: RefcasttypeContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.chain`.
	 * @param ctx the parse tree
	 */
	enterChain?: (ctx: ChainContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.chain`.
	 * @param ctx the parse tree
	 */
	exitChain?: (ctx: ChainContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	enterPrimary?: (ctx: PrimaryContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.primary`.
	 * @param ctx the parse tree
	 */
	exitPrimary?: (ctx: PrimaryContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.postfix`.
	 * @param ctx the parse tree
	 */
	enterPostfix?: (ctx: PostfixContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.postfix`.
	 * @param ctx the parse tree
	 */
	exitPostfix?: (ctx: PostfixContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.postdot`.
	 * @param ctx the parse tree
	 */
	enterPostdot?: (ctx: PostdotContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.postdot`.
	 * @param ctx the parse tree
	 */
	exitPostdot?: (ctx: PostdotContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.callinvoke`.
	 * @param ctx the parse tree
	 */
	enterCallinvoke?: (ctx: CallinvokeContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.callinvoke`.
	 * @param ctx the parse tree
	 */
	exitCallinvoke?: (ctx: CallinvokeContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.fieldaccess`.
	 * @param ctx the parse tree
	 */
	enterFieldaccess?: (ctx: FieldaccessContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.fieldaccess`.
	 * @param ctx the parse tree
	 */
	exitFieldaccess?: (ctx: FieldaccessContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.braceaccess`.
	 * @param ctx the parse tree
	 */
	enterBraceaccess?: (ctx: BraceaccessContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.braceaccess`.
	 * @param ctx the parse tree
	 */
	exitBraceaccess?: (ctx: BraceaccessContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	enterArrayinitializer?: (ctx: ArrayinitializerContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.arrayinitializer`.
	 * @param ctx the parse tree
	 */
	exitArrayinitializer?: (ctx: ArrayinitializerContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.listinitializer`.
	 * @param ctx the parse tree
	 */
	enterListinitializer?: (ctx: ListinitializerContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.listinitializer`.
	 * @param ctx the parse tree
	 */
	exitListinitializer?: (ctx: ListinitializerContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.mapinitializer`.
	 * @param ctx the parse tree
	 */
	enterMapinitializer?: (ctx: MapinitializerContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.mapinitializer`.
	 * @param ctx the parse tree
	 */
	exitMapinitializer?: (ctx: MapinitializerContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.maptoken`.
	 * @param ctx the parse tree
	 */
	enterMaptoken?: (ctx: MaptokenContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.maptoken`.
	 * @param ctx the parse tree
	 */
	exitMaptoken?: (ctx: MaptokenContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.arguments`.
	 * @param ctx the parse tree
	 */
	enterArguments?: (ctx: ArgumentsContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.arguments`.
	 * @param ctx the parse tree
	 */
	exitArguments?: (ctx: ArgumentsContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.argument`.
	 * @param ctx the parse tree
	 */
	enterArgument?: (ctx: ArgumentContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.argument`.
	 * @param ctx the parse tree
	 */
	exitArgument?: (ctx: ArgumentContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.lambda`.
	 * @param ctx the parse tree
	 */
	enterLambda?: (ctx: LambdaContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.lambda`.
	 * @param ctx the parse tree
	 */
	exitLambda?: (ctx: LambdaContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.lamtype`.
	 * @param ctx the parse tree
	 */
	enterLamtype?: (ctx: LamtypeContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.lamtype`.
	 * @param ctx the parse tree
	 */
	exitLamtype?: (ctx: LamtypeContext) => void;

	/**
	 * Enter a parse tree produced by `PainlessParser.funcref`.
	 * @param ctx the parse tree
	 */
	enterFuncref?: (ctx: FuncrefContext) => void;
	/**
	 * Exit a parse tree produced by `PainlessParser.funcref`.
	 * @param ctx the parse tree
	 */
	exitFuncref?: (ctx: FuncrefContext) => void;
}

