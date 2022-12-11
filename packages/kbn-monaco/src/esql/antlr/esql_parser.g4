
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

parser grammar esql_parser;

options {tokenVocab=esql_lexer;}

singleStatement
    : query EOF
    ;

query
    : sourceCommand                 #singleCommandQuery
    | query PIPE processingCommand  #compositeQuery
    ;

sourceCommand
    : explainCommand
    | fromCommand
    | rowCommand
    ;

processingCommand
    : evalCommand
    | limitCommand
    | projectCommand
    | sortCommand
    | statsCommand
    | whereCommand
    ;

whereCommand
    : WHERE booleanExpression
    ;

booleanExpression
    : NOT booleanExpression                                               #logicalNot
    | valueExpression                                                     #booleanDefault
    | left=booleanExpression operator=AND right=booleanExpression         #logicalBinary
    | left=booleanExpression operator=OR right=booleanExpression          #logicalBinary
    ;

valueExpression
    : functionIdentifier LP (functionExpressionArgument (COMMA functionExpressionArgument)*)? RP  #valueFunctionExpression
    | operatorExpression                                                                          #valueExpressionDefault
    | left=operatorExpression comparisonOperator right=operatorExpression                         #comparison
    ;

operatorExpression
    : primaryExpression                                                                       #operatorExpressionDefault
    | operator=(MINUS | PLUS) operatorExpression                                              #arithmeticUnary
    | left=operatorExpression operator=(ASTERISK | SLASH | PERCENT) right=operatorExpression  #arithmeticBinary
    | left=operatorExpression operator=(PLUS | MINUS) right=operatorExpression                #arithmeticBinary
    ;

primaryExpression
    : constant                                                                          #constantDefault
    | qualifiedName                                                                     #dereference
    | LP booleanExpression RP                                                           #parenthesizedExpression
    | identifier LP (booleanExpression (COMMA booleanExpression)*)? RP                  #functionExpression
    ;

rowCommand
    : ROW fields
    ;

fields
    : field (COMMA field)*
    ;

field
    : qualifiedName ASSIGN valueExpression
    | booleanExpression
    | qualifiedName ASSIGN booleanExpression
    ;

fromCommand
    : FROM sourceIdentifier (COMMA sourceIdentifier)*
    ;

evalCommand
    : EVAL fields
    ;

statsCommand
    : STATS fields (BY qualifiedNames)?
    ;

sourceIdentifier
    : SRC_UNQUOTED_IDENTIFIER
    | SRC_QUOTED_IDENTIFIER
    ;

functionExpressionArgument
   : qualifiedName
   | string
   ;

qualifiedName
    : identifier (DOT identifier)*
    ;

qualifiedNames
    : qualifiedName (COMMA qualifiedName)*
    ;

identifier
    : UNQUOTED_IDENTIFIER
    | QUOTED_IDENTIFIER
    ;

functionIdentifier
    : ROUND_FUNCTION_MATH
    | AVG_FUNCTION_MATH
    | SUM_FUNCTION_MATH
    | MIN_FUNCTION_MATH
    | MAX_FUNCTION_MATH
    ;


constant
    : NULL                                                                              #nullLiteral
    | number                                                                            #numericLiteral
    | booleanValue                                                                      #booleanLiteral
    | string                                                                            #stringLiteral
    ;

limitCommand
    : LIMIT INTEGER_LITERAL
    ;

sortCommand
    : SORT orderExpression (COMMA orderExpression)*
    ;

orderExpression
    : booleanExpression ordering=(ASC | DESC)? (NULLS nullOrdering=(FIRST | LAST))?
    ;

projectCommand
    :  PROJECT projectClause (COMMA projectClause)*
    ;

projectClause
    : sourceIdentifier
    | newName=sourceIdentifier ASSIGN oldName=sourceIdentifier
    ;

booleanValue
    : TRUE | FALSE
    ;

number
    : DECIMAL_LITERAL  #decimalLiteral
    | INTEGER_LITERAL  #integerLiteral
    ;

string
    : STRING
    ;

comparisonOperator
    : EQ | NEQ | LT | LTE | GT | GTE
    ;

explainCommand
    : EXPLAIN subqueryExpression
    ;

subqueryExpression
    : OPENING_BRACKET query CLOSING_BRACKET
    ;
