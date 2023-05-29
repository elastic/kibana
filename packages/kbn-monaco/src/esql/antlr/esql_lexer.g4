/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

lexer grammar esql_lexer;

DISSECT : D I S S E C T -> pushMode(EXPRESSION);
GROK : G R O K -> pushMode(EXPRESSION);
EVAL : E V A L -> pushMode(EXPRESSION);
EXPLAIN : E X P L A I N -> pushMode(EXPLAIN_MODE);
FROM : F R O M -> pushMode(SOURCE_IDENTIFIERS);
ROW : R O W -> pushMode(EXPRESSION);
STATS : S T A T S -> pushMode(EXPRESSION);
WHERE : W H E R E -> pushMode(EXPRESSION);
SORT : S O R T -> pushMode(EXPRESSION);
MV_EXPAND : M V UNDERSCORE E X P A N D -> pushMode(EXPRESSION);
LIMIT : L I M I T -> pushMode(EXPRESSION);
PROJECT : P R O J E C T -> pushMode(EXPRESSION);
DROP : D R O P -> pushMode(EXPRESSION);
RENAME : R E N A M E -> pushMode(EXPRESSION);
SHOW : S H O W -> pushMode(EXPRESSION);

LINE_COMMENT
    : '//' ~[\r\n]* '\r'? '\n'? -> channel(HIDDEN)
    ;

MULTILINE_COMMENT
    : '/*' (MULTILINE_COMMENT|.)*? '*/' -> channel(HIDDEN)
    ;

WS
    : [ \r\n\t]+ -> channel(HIDDEN)
    ;
mode EXPLAIN_MODE;
EXPLAIN_OPENING_BRACKET : '[' -> type(OPENING_BRACKET), pushMode(DEFAULT_MODE);
EXPLAIN_PIPE : '|' -> type(PIPE), popMode;
EXPLAIN_WS : WS -> channel(HIDDEN);
EXPLAIN_LINE_COMMENT : LINE_COMMENT -> channel(HIDDEN);
EXPLAIN_MULTILINE_COMMENT : MULTILINE_COMMENT -> channel(HIDDEN);
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

DATE_LITERAL
    : 'year'
    | 'month'
    | 'day'
    | 'second'
    | 'minute'
    | 'hour'
    ;

AND : 'and';
ASSIGN : '=';
COMMA : ',';
DOT : '.';
LP : '(';
OPENING_BRACKET : '[' -> pushMode(EXPRESSION), pushMode(EXPRESSION);
CLOSING_BRACKET : ']' -> popMode, popMode;
NOT : 'not';
LIKE: L I K E;
RLIKE: R L I K E;
IN: I N;
NULL : 'null';
OR : 'or';
RP : ')';
UNDERSCORE: '_';
INFO : 'info';
FUNCTIONS : 'functions';

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
    : R O U N D
    | A B S
    | S U B S T R I N G
    | C O N C A T
    | S T A R T S UNDERSCORE W I T H
    | D A T E UNDERSCORE F O R M A T
    | D A T E UNDERSCORE T R U N C
    | D A T E UNDERSCORE P A R S E
    | A U T O UNDERSCORE B U C K E T
    | I S UNDERSCORE F I N I T E
    | I S UNDERSCORE I N F I N I T E
    | C A S E
    | L E N G T H
    | M V UNDERSCORE M A X
    | M V UNDERSCORE M I N
    | M V UNDERSCORE M A X
    | M V UNDERSCORE S U M
    | M V UNDERSCORE C O U N T
    | M V UNDERSCORE J O I N
    | M V UNDERSCORE M E D I A N
    | S P L I T
    | T O UNDERSCORE S T R I N G
    ;

UNARY_FUNCTION
    : A V G
    | M I N
    | M A X
    | S U M
    | C O U N T
    | C O U N T UNDERSCORE D I S T I N C T
    ;

WHERE_FUNCTIONS
    : I S UNDERSCORE N U L L
    | C I D R UNDERSCORE M A T C H
    ;

UNQUOTED_IDENTIFIER
    : (LETTER | '_') (LETTER | DIGIT | '_' | ASTERISK)*
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

fragment A : [aA]; // match either an 'a' or 'A'
fragment B : [bB];
fragment C : [cC];
fragment D : [dD];
fragment E : [eE];
fragment F : [fF];
fragment G : [gG];
fragment H : [hH];
fragment I : [iI];
fragment J : [jJ];
fragment K : [kK];
fragment L : [lL];
fragment M : [mM];
fragment N : [nN];
fragment O : [oO];
fragment P : [pP];
fragment Q : [qQ];
fragment R : [rR];
fragment S : [sS];
fragment T : [tT];
fragment U : [uU];
fragment V : [vV];
fragment W : [wW];
fragment X : [xX];
fragment Y : [yY];
fragment Z : [zZ];