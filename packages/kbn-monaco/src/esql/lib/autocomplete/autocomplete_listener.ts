/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import type { AutocompleteCommandDefinition, UserDefinedVariables } from './types';
import { DynamicAutocompleteItem } from './dymanic_item';

import { esql_parserListener as ESQLParserListener } from '../../antlr/esql_parser_listener';
import {
  esql_parser,
  esql_parser as ESQLParser,
  EnrichCommandContext,
  EnrichWithClauseContext,
} from '../../antlr/esql_parser';

import {
  processingCommandsDefinitions,
  sourceCommandsDefinitions,
  orderingCommandsDefinitions,
  nullsCommandsDefinition,
  nullsOrderingCommandsDefinitions,
  comparisonCommandsDefinitions,
  comparisonOperatorsCommandsDefinitions,
  byOperatorDefinition,
  pipeDefinition,
  openBracketDefinition,
  closeBracketDefinition,
  mathOperatorsCommandsDefinitions,
  aggregationFunctionsDefinitions,
  mathCommandDefinition,
  whereCommandDefinition,
  assignOperatorDefinition,
  buildConstantsDefinitions,
  buildNewVarDefinition,
  asOperatorDefinition,
} from './autocomplete_definitions';

import {
  EvalCommandContext,
  StatsCommandContext,
  ComparisonContext,
  WhereCommandContext,
  SourceCommandContext,
  OrderExpressionContext,
  FieldContext,
  QualifiedNameContext,
  ProcessingCommandContext,
  SourceIdentifierContext,
  UserVariableContext,
  BooleanExpressionContext,
  RegexBooleanExpressionContext,
  WhereBooleanExpressionContext,
  LimitCommandContext,
  ValueExpressionContext,
  KeepCommandContext,
  DropCommandContext,
  RenameCommandContext,
  DissectCommandContext,
  GrokCommandContext,
  MvExpandCommandContext,
} from '../../antlr/esql_parser';
import {
  onOperatorDefinition,
  withOperatorDefinition,
} from './autocomplete_definitions/operators_commands';

export function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export class AutocompleteListener implements ESQLParserListener {
  private suggestions: Array<AutocompleteCommandDefinition | DynamicAutocompleteItem> = [];
  private readonly userDefinedVariables: UserDefinedVariables = {
    sourceIdentifiers: [],
    policyIdentifiers: [],
  };
  private readonly tables: string[][] = [];
  private parentContext: number | undefined;

  private get fields(): [DynamicAutocompleteItem] {
    return [DynamicAutocompleteItem.FieldIdentifier];
  }

  private get policies(): [DynamicAutocompleteItem] {
    return [DynamicAutocompleteItem.PolicyIdentifier];
  }

  private get policyFields(): [DynamicAutocompleteItem] {
    return [DynamicAutocompleteItem.PolicyFieldIdentifier];
  }

  private get policyMatchingField(): [DynamicAutocompleteItem] {
    return [DynamicAutocompleteItem.PolicyMatchingFieldIdentifier];
  }

  private get hasSuggestions() {
    return Boolean(this.suggestions.length);
  }

  private isTerminalNodeExists(node: TerminalNode | undefined) {
    return node && node.payload?.startIndex >= 0;
  }

  private applyConditionalSuggestion(
    skipDefinitions: AutocompleteCommandDefinition[],
    targetDefinition: AutocompleteCommandDefinition,
    context: number
  ) {
    if (!skipDefinitions.find((i) => i === targetDefinition) && this.parentContext === context) {
      return targetDefinition;
    }
  }

  private getEndCommandSuggestions(skipDefinitions: AutocompleteCommandDefinition[] = []) {
    return [
      pipeDefinition,
      this.applyConditionalSuggestion(skipDefinitions, byOperatorDefinition, ESQLParser.STATS),
      this.applyConditionalSuggestion(skipDefinitions, onOperatorDefinition, ESQLParser.ENRICH),
      this.applyConditionalSuggestion(skipDefinitions, withOperatorDefinition, ESQLParser.ENRICH),
    ].filter(nonNullable);
  }

  private getNewVarName() {
    const vars = this.tables.flat();
    let index = 0;

    while (true) {
      const value = `var${index}`;
      if (!vars.includes(value)) {
        return value;
      }
      index++;
    }
  }

  getAutocompleteSuggestions() {
    return {
      suggestions: this.suggestions,
      userDefinedVariables: this.userDefinedVariables,
    };
  }

  /** ESQLParserListener fields  **/

  enterSourceCommand(ctx: SourceCommandContext) {
    this.suggestions = [];
  }

  exitSourceCommand(ctx: SourceCommandContext) {
    if (ctx.exception) {
      this.suggestions = sourceCommandsDefinitions;
    }
  }

  enterSourceIdentifier(ctx: SourceIdentifierContext) {
    this.suggestions = [DynamicAutocompleteItem.SourceIdentifier];
  }

  exitSourceIdentifier(ctx: SourceIdentifierContext) {
    if (!ctx.childCount) {
      this.suggestions = [DynamicAutocompleteItem.SourceIdentifier];
    } else if (!ctx.exception && ctx.text) {
      this.userDefinedVariables.sourceIdentifiers.push(ctx.text);
    }
  }

  enterProcessingCommand(ctx: ProcessingCommandContext) {
    this.tables.push([]);
    this.suggestions = [];
    this.parentContext = undefined;
  }

  exitProcessingCommand(ctx: ProcessingCommandContext) {
    if (ctx.exception) {
      this.suggestions = processingCommandsDefinitions;
    }
    this.parentContext = undefined;
  }

  enterStatsCommand(ctx: StatsCommandContext) {
    this.suggestions = [];
    this.parentContext = ESQLParser.STATS;
    const fn = ctx.fields();
    if (!fn) {
      this.suggestions = [buildNewVarDefinition(this.getNewVarName())];
      return;
    }
  }

  enterEvalCommand(ctx: EvalCommandContext) {
    this.suggestions = [];
    this.parentContext = ESQLParser.EVAL;
  }

  exitStatsCommand(ctx: StatsCommandContext) {
    const qn = ctx.qualifiedNames();
    if (qn && qn.text) {
      this.suggestions = this.getEndCommandSuggestions([byOperatorDefinition]);
    }
  }

  exitKeepCommand?(ctx: KeepCommandContext) {
    const qn = ctx.qualifiedNames();
    if (qn && qn.text) {
      if (qn.text.slice(-1) !== ',') {
        this.suggestions = this.getEndCommandSuggestions();
      }
    }
  }

  exitDropCommand?(ctx: DropCommandContext) {
    const qn = ctx.qualifiedNames();
    if (qn && qn.text) {
      if (qn.text.slice(-1) !== ',') {
        this.suggestions = this.getEndCommandSuggestions();
      }
    }
  }

  enterRenameCommand(ctx: RenameCommandContext) {
    this.parentContext = ESQLParser.RENAME;
  }

  exitRenameCommand?(ctx: RenameCommandContext) {
    const rc = ctx.renameClause();
    const commaExists = ctx.COMMA();
    if (!rc[0].exception) {
      const qn = rc[0].renameVariable();
      const asExists = this.isTerminalNodeExists(rc[0].AS());
      if (asExists && qn && !qn.text) {
        this.suggestions = [];
      }
      if (qn && qn.text) {
        if (!commaExists.length) {
          this.suggestions = this.getEndCommandSuggestions();
        }
      }
    }
  }

  exitDissectCommand?(ctx: DissectCommandContext) {
    const qn = ctx.qualifiedNames();
    const pattern = ctx.string();
    if (qn && qn.text && pattern && pattern.text && pattern.text !== '<missing STRING>') {
      this.suggestions = this.getEndCommandSuggestions();
    }
  }

  exitGrokCommand?(ctx: GrokCommandContext) {
    const qn = ctx.qualifiedNames();
    const pattern = ctx.string();
    if (qn && qn.text && pattern && pattern.text && pattern.text !== '<missing STRING>') {
      this.suggestions = this.getEndCommandSuggestions();
    }
  }

  exitMvExpandCommand?(ctx: MvExpandCommandContext) {
    const qn = ctx.qualifiedNames();
    if (qn && qn.text) {
      this.suggestions = this.getEndCommandSuggestions();
    }
  }

  exitQualifiedName(ctx: QualifiedNameContext) {
    const isInEval = this.parentContext === ESQLParser.EVAL;
    const isInStats = this.parentContext === ESQLParser.STATS;
    const isInRename = this.parentContext === ESQLParser.RENAME;
    if (this.parentContext && isInRename) {
      if (!ctx.exception && ctx.text) {
        this.suggestions = [asOperatorDefinition];
      }
    }
    if (this.parentContext && (isInStats || isInEval)) {
      this.suggestions = [
        ...this.getEndCommandSuggestions(),
        ...(isInEval ? mathOperatorsCommandsDefinitions : []),
      ];
    }

    if (
      ctx
        .identifier()
        .some(
          (i) =>
            !(
              this.isTerminalNodeExists(i.QUOTED_IDENTIFIER()) ||
              this.isTerminalNodeExists(i.UNQUOTED_IDENTIFIER())
            )
        )
    ) {
      this.suggestions = this.fields;
    }
  }

  enterField(ctx: FieldContext) {
    this.suggestions = [];
  }

  exitField(ctx: FieldContext) {
    const hasAssign = this.isTerminalNodeExists(ctx.ASSIGN());

    if (ctx.exception) {
      if (!hasAssign) {
        this.suggestions = [buildNewVarDefinition(this.getNewVarName())];
        return;
      }
    } else {
      if (!hasAssign) {
        this.suggestions = [assignOperatorDefinition];
      }
    }
  }

  exitUserVariable(ctx: UserVariableContext) {
    if (!ctx.exception && ctx.text) {
      this.tables.at(-1)?.push(ctx.text);
    }
  }

  enterBooleanExpression(ctx: BooleanExpressionContext) {
    this.suggestions = [];
  }

  exitBooleanExpression(ctx: BooleanExpressionContext) {
    if (ctx.exception) {
      const ve = ctx.valueExpression();
      if (!ve) {
        if (this.parentContext === ESQLParser.STATS) {
          this.suggestions = [...aggregationFunctionsDefinitions];
          return;
        }

        if (this.parentContext === ESQLParser.EVAL) {
          this.suggestions = [...mathCommandDefinition];
          return;
        }
      }
    }
  }

  exitValueExpression(ctx: ValueExpressionContext) {
    const isInStats = this.parentContext === ESQLParser.STATS;
    const isInEval = this.parentContext === ESQLParser.EVAL;

    if (this.parentContext && (isInStats || isInEval)) {
      const hasFN =
        ctx.tryGetToken(esql_parser.UNARY_FUNCTION, 0) ||
        ctx.tryGetToken(esql_parser.MATH_FUNCTION, 0);
      const hasLP = ctx.tryGetToken(esql_parser.LP, 0);
      const hasRP = ctx.tryGetToken(esql_parser.RP, 0);

      if (hasFN) {
        if (!hasLP) {
          this.suggestions = [openBracketDefinition];
          return;
        }
        if (!hasRP) {
          if (ctx.childCount === 3) {
            this.suggestions = [closeBracketDefinition, ...this.fields];
            return;
          }
        }
      } else {
        if (ctx.childCount === 1) {
          if (ctx.text && ctx.text.indexOf('(') === -1) {
            this.suggestions = [
              ...(isInEval ? mathCommandDefinition : []),
              ...(isInStats ? aggregationFunctionsDefinitions : []),
            ];
          }
          return;
        }
      }
      this.suggestions = this.fields;
    }
  }

  enterWhereBooleanExpression(ctx: WhereBooleanExpressionContext) {
    this.suggestions = [];
  }

  enterWhereCommand(ctx: WhereCommandContext) {
    this.suggestions = [];
    this.parentContext = ESQLParser.WHERE;
  }

  enterEnrichCommand(ctx: EnrichCommandContext) {
    this.suggestions = [];
    this.parentContext = ESQLParser.ENRICH;
  }

  exitEnrichCommand(ctx: EnrichCommandContext) {
    const policyName = ctx.enrichIdentifier().text;
    if (policyName && !this.userDefinedVariables.policyIdentifiers.includes(policyName)) {
      this.userDefinedVariables.policyIdentifiers.push(policyName);
    }

    if (this.parentContext === ESQLParser.WITH) {
      return;
    }
    if (!policyName) {
      this.suggestions = this.policies;
    }

    if (policyName)
      if (this.parentContext === ESQLParser.ENRICH) {
        const hasOn = this.isTerminalNodeExists(ctx.ON());
        if (hasOn && !ctx._matchField.text) {
          this.suggestions = this.policyMatchingField;
        } else {
          this.suggestions = this.getEndCommandSuggestions(
            hasOn ? [onOperatorDefinition] : undefined
          );
        }
      }
  }

  enterEnrichWithClause(ctx: EnrichWithClauseContext) {
    this.suggestions = [];
    this.parentContext = ESQLParser.WITH;
  }

  exitEnrichWithClause(ctx: EnrichWithClauseContext) {
    const hasAssign = this.isTerminalNodeExists(ctx.ASSIGN());
    // Note: this gets filled only after the assign operation :(
    if (ctx._newName?.text) {
      this.tables.at(-1)?.push(ctx._newName.text);
    }

    if (!ctx.exception && ctx.enrichFieldIdentifier().length === 1) {
      // if it's after the assign operator, then suggest the fields from the policy
      // TODO: need to check if the enrichFieldIdentifier given is a policyField or not and decide whether append the assignOperator
      this.suggestions = !hasAssign
        ? [assignOperatorDefinition, ...this.getEndCommandSuggestions()]
        : this.policyFields;
    } else {
      this.suggestions = [];
      if (!hasAssign) {
        this.suggestions.push(buildNewVarDefinition(this.getNewVarName()));
      }
      if (!ctx._enrichField?.text) {
        this.suggestions.push(...this.policyFields);
      }
      if (this.suggestions.length === 0) {
        this.suggestions = this.getEndCommandSuggestions([
          onOperatorDefinition,
          withOperatorDefinition,
        ]);
      }
    }
  }

  exitWhereCommand(ctx: WhereCommandContext) {
    const booleanExpression = ctx.whereBooleanExpression();

    if (booleanExpression.exception) {
      if (!booleanExpression.text) {
        this.suggestions = [...whereCommandDefinition, ...this.fields];
        return;
      }
      this.suggestions = this.fields;
      return;
    } else {
      const innerBooleanExpressions = booleanExpression.getRuleContexts(
        WhereBooleanExpressionContext
      );
      const regexBooleanExpression = booleanExpression.getRuleContexts(
        RegexBooleanExpressionContext
      );

      if (booleanExpression.WHERE_FUNCTIONS()) {
        if (booleanExpression.COMMA().length) {
          this.suggestions = [];
          return;
        }
      }

      if (regexBooleanExpression.length) {
        this.suggestions = [];
        return;
      }

      if (innerBooleanExpressions.some((be) => be.exception)) {
        this.suggestions = this.fields;
        return;
      }
    }
    if (!this.hasSuggestions && !booleanExpression.WHERE_FUNCTIONS()) {
      this.suggestions = comparisonCommandsDefinitions;
    }
  }

  exitComparison(ctx: ComparisonContext) {
    const operatorExpression = ctx.operatorExpression();
    if (operatorExpression.some((o) => o.exception)) {
      this.suggestions = this.fields;
      return;
    }
    this.suggestions = [
      ...comparisonOperatorsCommandsDefinitions,
      ...this.getEndCommandSuggestions(),
    ];
  }

  exitOrderExpression(ctx: OrderExpressionContext) {
    if (ctx.booleanExpression().exception) {
      this.suggestions = this.fields;
      return;
    }
    if (!this.isTerminalNodeExists(ctx.ORDERING())) {
      this.suggestions = orderingCommandsDefinitions;
      return;
    }
    if (!this.isTerminalNodeExists(ctx.NULLS_ORDERING())) {
      this.suggestions = [nullsCommandsDefinition];
      return;
    }
    if (!this.isTerminalNodeExists(ctx.NULLS_ORDERING_DIRECTION())) {
      this.suggestions = nullsOrderingCommandsDefinitions;
      return;
    }
  }

  exitLimitCommand(ctx: LimitCommandContext) {
    const DEFAULT_LIMIT_SIZE = 1000;

    if (!this.isTerminalNodeExists(ctx.INTEGER_LITERAL())) {
      this.suggestions = buildConstantsDefinitions([DEFAULT_LIMIT_SIZE.toString()], '');
    } else {
      this.suggestions = this.getEndCommandSuggestions();
    }
  }
}
