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
import { esql_parser as ESQLParser } from '../../antlr/esql_parser';

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
  mathOperatorsCommandsDefinitions,
  aggregationFunctionsDefinitions,
  assignOperatorDefinition,
  buildConstantsDefinitions,
  buildNewVarDefinition,
} from './autocomplete_definitions';

import {
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
} from '../../antlr/esql_parser';

export class AutocompleteListener implements ESQLParserListener {
  private suggestions: Array<AutocompleteCommandDefinition | DynamicAutocompleteItem> = [];
  private readonly userDefinedVariables: UserDefinedVariables = {
    sourceIdentifiers: [],
  };
  private readonly tables: string[][] = [];
  private parentContext: number | undefined;

  private get fields() {
    return this.tables.length > 1
      ? buildConstantsDefinitions(this.tables.at(-2)!)
      : [DynamicAutocompleteItem.FieldIdentifier];
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
    } else {
      this.suggestions = this.getEndCommandSuggestions([byOperatorDefinition]);
    }
  }

  enterField(ctx: FieldContext) {
    this.suggestions = [];
  }

  exitField(ctx: FieldContext) {
    const hasAssign = this.isTerminalNodeExists(ctx.ASSIGN());

    if (ctx.exception) {
      if (hasAssign) {
        this.suggestions = [...aggregationFunctionsDefinitions, ...this.fields];
      } else {
        this.suggestions = [buildNewVarDefinition(this.tables.at(-1)?.length ?? 0)];
      }
      return;
    }

    const sv = ctx.setVariable();
    if (sv) {
      try {
        if (this.isTerminalNodeExists(sv.RP())) {
          this.suggestions = this.getEndCommandSuggestions();
          return;
        }
      } catch (e) {
        // nothing to be here
      }
      this.suggestions = this.fields;
      return;
    }

    const be = ctx.booleanExpression();
    if (!be?.exception) {
      this.suggestions = this.getEndCommandSuggestions();

      const ve = be?.valueExpression();

      if (ve?.exception) {
        this.suggestions = this.fields;
        return;
      }
      if (hasAssign) {
        this.suggestions = [...this.suggestions, ...mathOperatorsCommandsDefinitions];
      } else {
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
    }
  }
}
