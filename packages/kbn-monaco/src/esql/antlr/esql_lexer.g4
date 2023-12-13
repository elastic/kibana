/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
 
lexer grammar esql_lexer;
options {  }

DISSECT : D I S S E C T -> pushMode(EXPRESSION);
DROP : D R O P -> pushMode(SOURCE_IDENTIFIERS);
ENRICH : E N R I C H -> pushMode(SOURCE_IDENTIFIERS);
EVAL : E V A L -> pushMode(EXPRESSION);
FROM : F R O M -> pushMode(SOURCE_IDENTIFIERS);
GROK : G R O K -> pushMode(EXPRESSION);
KEEP : K E E P -> pushMode(SOURCE_IDENTIFIERS);
LIMIT : L I M I T -> pushMode(EXPRESSION);
MV_EXPAND : M V UNDERSCORE E X P A N D -> pushMode(SOURCE_IDENTIFIERS);
PROJECT : P R O J E C T -> pushMode(SOURCE_IDENTIFIERS);
RENAME : R E N A M E -> pushMode(SOURCE_IDENTIFIERS);
ROW : R O W -> pushMode(EXPRESSION);
SHOW : S H O W -> pushMode(EXPRESSION);
SORT : S O R T -> pushMode(EXPRESSION);
STATS : S T A T S -> pushMode(EXPRESSION);
WHERE : W H E R E -> pushMode(EXPRESSION);
UNKNOWN_CMD : ~[ \r\n\t[\]/]+ -> pushMode(EXPRESSION);

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

BY : B Y;

AND : A N D;
ASC : A S C;
ASSIGN : '=';
COMMA : ',';
DESC : D E S C;
DOT : '.';
FALSE : F A L S E;
FIRST : F I R S T;
LAST : L A S T;
LP : '(';
IN: I N;
IS: I S;
LIKE: L I K E;
NOT : N O T;
NULL : N U L L;
NULLS : N U L L S;
OR : O R;
PARAM: '?';
RLIKE: R L I K E;
RP : ')';
TRUE : T R U E;
INFO : I N F O;
FUNCTIONS : F U N C T I O N S;
UNDERSCORE: '_';

EQ  : '==';
NEQ : '!=';
LT  : '<';
LTE : '<=';
GT  : '>';
GTE : '>=';

PLUS : '+';
MINUS : '-';
ASTERISK : '*';
SLASH : '/';
PERCENT : '%';

// Brackets are funny. We can happen upon a CLOSING_BRACKET in two ways - one
// way is to start in an explain command which then shifts us to expression
// mode. Thus, the two popModes on CLOSING_BRACKET. The other way could as
// the start of a multivalued field constant. To line up with the double pop
// the explain mode needs, we double push when we see that.
OPENING_BRACKET : '[' -> pushMode(EXPRESSION), pushMode(EXPRESSION);
CLOSING_BRACKET : ']' -> popMode, popMode;


UNQUOTED_IDENTIFIER
    : LETTER (LETTER | DIGIT | '_')*
    // only allow @ at beginning of identifier to keep the option to allow @ as infix operator in the future
    // also, single `_` and `@` characters are not valid identifiers
    | ('_' | '@') (LETTER | DIGIT | '_')+
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
SRC_OPENING_BRACKET : '[' -> type(OPENING_BRACKET), pushMode(SOURCE_IDENTIFIERS), pushMode(SOURCE_IDENTIFIERS);
SRC_CLOSING_BRACKET : ']' -> popMode, popMode, type(CLOSING_BRACKET);
SRC_COMMA : ',' -> type(COMMA);
SRC_ASSIGN : '=' -> type(ASSIGN);
AS : A S;
METADATA: M E T A D A T A;
ON : O N;
WITH : W I T H;

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