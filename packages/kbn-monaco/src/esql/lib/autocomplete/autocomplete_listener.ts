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
import { esql_parser, esql_parser as ESQLParser } from '../../antlr/esql_parser';

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
  roundCommandDefinition,
  assignOperatorDefinition,
  buildConstantsDefinitions,
  buildNewVarDefinition,
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
  LimitCommandContext,
  ValueExpressionContext,
} from '../../antlr/esql_parser';

export class AutocompleteListener implements ESQLParserListener {
  private suggestions: Array<AutocompleteCommandDefinition | DynamicAutocompleteItem> = [];
  private readonly userDefinedVariables: UserDefinedVariables = {
    sourceIdentifiers: [],
  };
  private readonly tables: string[][] = [];
  private parentContext: number | undefined;
  private onlyCustomVars: boolean = false;

  private get fields() {
    const fieldsSuggestions: Array<DynamicAutocompleteItem | AutocompleteCommandDefinition> = [
      DynamicAutocompleteItem.FieldIdentifier,
    ];
    const flattened = this.tables.slice(0, this.tables.length - 1).flat();
    if (flattened.length) {
      fieldsSuggestions.push(...buildConstantsDefinitions(flattened));
    }
    return this.onlyCustomVars ? buildConstantsDefinitions(flattened) : fieldsSuggestions;
  }

  private get hasSuggestions() {
    return Boolean(this.suggestions.length);
  }

  private isTerminalNodeExists(node: TerminalNode | undefined) {
    return node && node.payload?.startIndex >= 0;
  }

  private getEndCommandSuggestions(skipDefinitions: AutocompleteCommandDefinition[] = []) {
    const suggestions = [pipeDefinition];

    if (
      !skipDefinitions.find((i) => i === byOperatorDefinition) &&
      this.parentContext === ESQLParser.STATS
    ) {
      suggestions.push(byOperatorDefinition);
    }
    return suggestions;
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
    } else if (!this.hasSuggestions) {
      this.suggestions = this.getEndCommandSuggestions();
    }
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
    this.onlyCustomVars = true;
  }

  exitQualifiedName(ctx: QualifiedNameContext) {
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
          this.suggestions = [...aggregationFunctionsDefinitions, ...this.fields];
          return;
        }

        if (this.parentContext === ESQLParser.EVAL) {
          this.suggestions = [roundCommandDefinition, ...this.fields];
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
          this.suggestions = [
            ...this.getEndCommandSuggestions(),
            ...(isInEval ? mathOperatorsCommandsDefinitions : []),
          ];
          return;
        }
      }
      this.suggestions = this.fields;
    }
  }

  enterWhereCommand(ctx: WhereCommandContext) {
    this.suggestions = [];
    this.parentContext = ESQLParser.WHERE;
  }

  exitWhereCommand(ctx: WhereCommandContext) {
    const booleanExpression = ctx.booleanExpression();

    if (booleanExpression.exception) {
      this.suggestions = this.fields;
      return;
    } else {
      const innerBooleanExpressions = booleanExpression.getRuleContexts(BooleanExpressionContext);
      if (innerBooleanExpressions.some((be) => be.exception)) {
        this.suggestions = this.fields;
        return;
      }
    }
    if (!this.hasSuggestions) {
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
