
/**
 * Parser to convert textual structured queries into an AST (Abstract Syntax Tree) representation.
 * <p/>
 * The language that this parser parses is spelled out roughly by this ABNF:
 * <pre>
 * ;; definition for boolean values true/false
 * BOOLEAN_LITERAL  =   "TRUE" / "FALSE"
 *
 * ;; natural definitions for INTEGER and DECIMAL literals
 * INTEGER_LITERAL  =   1*DIGIT
 * DOUBLE_LITERAL   =   1*DIGIT "." *DIGIT
 *
 * ;; IP_LITERAL values are IPV4 literals i.e. 192.168.1.1  masks are currently not supported
 * IP_LITERAL       =   3DIGIT "." 3DIGIT "." 3DIGIT "." 3DIGIT
 *
 * ;; STRING_LITERAL values are double-quoted strings
 * STRING_LITERAL   =   DQUOTE *( ( "\" DQUOTE ) / %x20-21 / %x23-7f ) DQUOTE
 *
 * ;; DATETIME_LITERAL is an ISO 8901 date/time value, ALWAYS specified in GMT
 * DATETIME_LITERAL =   4DIGIT "-" 2DIGIT "-" 2DIGIT "T" 2DIGIT ":" 2DIGIT ":" 2DIGIT "." 3DIGIT "Z"
 *
 * ;; NULL_LITERAL is reserved word for representation of NULL value
 * NULL_LITERAL     =   "NULL"
 *
 * ;; SIMPLE_VALUES are any of the simple atomic types (not SET or RANGE literals)
 * SIMPLE_VALUE     =   INTEGER_LITERAL / DOUBLE_LITERAL / STRING_LITERAL / DATETIME_LITERAL / NULL_LITERAL / BOOLEAN_LITERAL
 *
 * ;; SET_LITERAL represents a mathematical "set" of simple values
 * SET_LITERAL      =   "{" SIMPLE_VALUE *( "," SIMPLE_VALUE ) "}"
 *
 * ;; RANGE_LITERAL represents an interval of simple values, inclusive or exclusive on either end
 * RANGE_LITERAL    =   ( "[" / "(" ) SIMPLE_VALUE "," SIMPLE_VALUE ( "]" / ")" )
 *
 * ;; the comparison operators between fields and simple values
 * COMPARE_OP       =   "=" / ">" / "<" / ">=" / "<=" / "~=" / "∋"
 *
 * ;; a FIELD_NAME is dot-separated "words", where a word is the equivalent of a java identifier
 * WORD             =   (ALPHA / "_") *( ALPHA / DIGIT / "_" )
 * FIELD_NAME       =   WORD *( "." WORD )
 *
 * ;; comparisons compare a field to a simple value
 * COMPARISON       =   FIELD_NAME COMPARE_OP SIMPLE_VALUE
 *
 * ;; an in clause checks whether a field is in a set or range of values
 * IN_CLAUSE        =   FIELD_NAME "IN" ( SET_LITERAL / RANGE_LITERAL )
 *
 * ;; is clause to compare a field with NULL
 * IS_CLAUSE        = FIELD_NAME "IS" NULL_LITERAL
 *
 * ;; binary boolean expressions are built from infix notation with AND and OR
 * BINARY_BOOL      =   EXPR ( "AND" / "OR" ) EXPR
 *
 * ;; unary expressions negation, with a prefix NOT and existance of a set of sub objects with a prefix of EXISTS
 * UNARY_BOOL       =   ("NOT" / "EXISTS") EXPR
 *
 * ;; Match all
 * ANY              =   "ANY"
 *
 * ;; expressions are simple comparisons and their binary combinations. A FIELD_NAME is a valid expression iff the field is a boolean type
 * EXPR             =   ANY / ( FIELD_NAME / COMPARISON / IN_CLAUSE / IS_CLAUSE / BINARY_BOOL / UNARY_BOOL / EXISTS_SCOPE / ( "(" EXPR ")" ) )
 *
 * </pre>
 * <p/>
 *
 */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
"("                   return 'OPAREN'
")"                   return 'CPAREN'
"{"                   return 'OCURLY'
"}"                   return 'CCURLY'
"["                   return 'OBRACK'
"]"                   return 'CBRACK'
","                   return 'COMMA'
"."                   return 'DOT'
"="                   return 'EQ'
"~="                   return 'LIKE'
">"                   return 'GT'
"<"                   return 'LT'
">="                   return 'GTE'
"<="                   return 'LTE'
"AND"                  return 'AND'
"OR"                  return 'OR'
"NOT"                   return 'NOT'
"NULL"                 return 'NULL'
"ANY"                   return 'ANY'
"IN"                   return 'IN'
"IS"                   return 'IS'
"EXISTS"                  return 'EXISTS'
"TRUE"                  return 'TRUE'
"FALSE"                  return 'FALSE'
(?:[0-9]{1,3}\.){3}[0-9]{1,3}  return 'IPV4'
T[0-2][0-9]\:[0-5][0-9]\:[0-5][0-9](Z|\.[0-9]{3}Z) return 'TIME'
[0-9]{4}\-([0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01]) return 'DATE'
[0-9]+             return 'NUMBER'
[\w]?\"(\\.|[^\\"])*\"    return 'STRING'
[A-Za-z_\-]+                   return 'FIELD'
<<EOF>>               return 'EOF'


/lex

/* operator associations and precedence */

%right OR AND
%left EQ LIKE GT LT GTE LTE
%left NOT EXISTS


%start expressions

%% /* language grammar */

expressions
    : e EOF
      {return $1;}
    | ANY EOF
      {return $1;}
    ;

booleanValue
    : TRUE | FALSE
    ;
    
fieldPath
    : FIELD
    | fieldPath DOT FIELD
    ;

decimal
    : NUMBER DOT NUMBER
    ;
    
dateTime
    : DATE TIME
    ;
    
rangeLiteral
    : OBRACK simpleValue COMMA simpleValue CBRACK
    | OBRACK simpleValue COMMA simpleValue CPAREN
    | OPAREN simpleValue COMMA simpleValue CPAREN
    | OPAREN simpleValue COMMA simpleValue CBRACK
    ;
    
setValue
    : simpleValue
    | setValue COMMA simpleValue
    ;

setLiteral
    : OCURLY setValue CCURLY
    ;
    
inClause
    : fieldPath IN rangeLiteral
    | fieldPath IN setLiteral
    ;
    
isClause
    :  fieldPath IS NULL
    ;
    
simpleValue
    : decimal | NUMBER | STRING | NULL | booleanValue | IPV4 | DATE | dateTime
    ;

operator
    : EQ | LIKE | GT | LT | GTE | LTE
    ;

comparison
    : fieldPath operator simpleValue
    ;

boolExpression
    : e AND e
    | e OR e
    ;

unaryExpression
    : NOT e
    | EXISTS e
    ;

e
    : boolExpression
    | unaryExpression
    | comparison
    | fieldPath
      { $$ = new parser.TermQuery($1, true); }
    | inClause
    | isClause
    | OPAREN e CPAREN
    ;

/* see https://zaach.github.io/jison/try/usf/index.html to test */