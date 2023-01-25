/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

lexer grammar esql_lexer;

EVAL : 'eval' -> pushMode(EXPRESSION);
EXPLAIN : 'explain' -> pushMode(EXPRESSION);
FROM : 'from' -> pushMode(SOURCE_IDENTIFIERS);
ROW : 'row' -> pushMode(EXPRESSION);
STATS : 'stats' -> pushMode(EXPRESSION);
WHERE : 'where' -> pushMode(EXPRESSION);
SORT : 'sort' -> pushMode(EXPRESSION);
LIMIT : 'limit' -> pushMode(EXPRESSION);
PROJECT : 'project' -> pushMode(SOURCE_IDENTIFIERS);

LINE_COMMENT
    : '//' ~[\r\n]* '\r'? '\n'? -> channel(HIDDEN)
    ;

MULTILINE_COMMENT
    : '/*' (MULTILINE_COMMENT|.)*? '*/' -> channel(HIDDEN)
    ;

WS
    : [ \r\n\t]+ -> channel(HIDDEN)
    ;

mode EXPRESSION;

PIPE : '|' -> popMode;

fragment DIGIT
    : [0-9]
    ;

fragment LETTER
    : [A-Za-z]
    ;

fragment ESCAPE_SEQUENCE
    : '\\' [tnr"\\]
    ;

fragment UNESCAPED_CHARS
    : ~[\r\n"\\]
    ;

fragment EXPONENT
    : [Ee] [+-]? DIGIT+
    ;

STRING
    : '"' (ESCAPE_SEQUENCE | UNESCAPED_CHARS)* '"'
    | '"""' (~[\r\n])*? '"""' '"'? '"'?
    ;

INTEGER_LITERAL
    : DIGIT+
    ;

DECIMAL_LITERAL
    : DIGIT+ DOT DIGIT*
    | DOT DIGIT+
    | DIGIT+ (DOT DIGIT*)? EXPONENT
    | DOT DIGIT+ EXPONENT
    ;

BY : 'by';

AND : 'and';
ASSIGN : '=';
COMMA : ',';
DOT : '.';
LP : '(';
OPENING_BRACKET : '[' -> pushMode(DEFAULT_MODE);
CLOSING_BRACKET : ']' -> popMode, popMode; // pop twice, once to clear mode of current cmd and once to exit DEFAULT_MODE
NOT : 'not';
NULL : 'null';
OR : 'or';
RP : ')';

BOOLEAN_VALUE
   : 'true'
   | 'false'
   ;

COMPARISON_OPERATOR
    : '=='
    |'!='
    | '<'
    | '<='
    | '>'
    | '>='
    ;

PLUS : '+';
MINUS : '-';
ASTERISK : '*';
SLASH : '/';
PERCENT : '%';

ORDERING
    : 'asc'
    | 'desc'
    ;

NULLS_ORDERING: 'nulls';
NULLS_ORDERING_DIRECTION
    : 'first'
    | 'last'
    ;

MATH_FUNCTION
    : 'round'
    ;

UNARY_FUNCTION
    : 'avg'
    | 'min'
    | 'max'
    | 'sum'
    ;

UNQUOTED_IDENTIFIER
    : (LETTER | '_') (LETTER | DIGIT | '_')*
    ;

QUOTED_IDENTIFIER
    : '`' ( ~'`' | '``' )* '`'
    ;

EXPR_LINE_COMMENT
    : LINE_COMMENT -> channel(HIDDEN)
    ;

EXPR_MULTILINE_COMMENT
    : MULTILINE_COMMENT -> channel(HIDDEN)
    ;

EXPR_WS
    : WS -> channel(HIDDEN)
    ;


mode SOURCE_IDENTIFIERS;

SRC_PIPE : '|' -> type(PIPE), popMode;
SRC_CLOSING_BRACKET : ']' -> popMode, popMode, type(CLOSING_BRACKET);
SRC_COMMA : ',' -> type(COMMA);
SRC_ASSIGN : '=' -> type(ASSIGN);

SRC_UNQUOTED_IDENTIFIER
    : SRC_UNQUOTED_IDENTIFIER_PART+
    ;

fragment SRC_UNQUOTED_IDENTIFIER_PART
    : ~[=`|,[\]/ \t\r\n]+
    | '/' ~[*/] // allow single / but not followed by another / or * which would start a comment
    ;

SRC_QUOTED_IDENTIFIER
    : QUOTED_IDENTIFIER
    ;

SRC_LINE_COMMENT
    : LINE_COMMENT -> channel(HIDDEN)
    ;

SRC_MULTILINE_COMMENT
    : MULTILINE_COMMENT -> channel(HIDDEN)
    ;

SRC_WS
    : WS -> channel(HIDDEN)
    ;
