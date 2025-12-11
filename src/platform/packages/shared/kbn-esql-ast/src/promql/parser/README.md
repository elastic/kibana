# PromQL parser

This is a parser for embedded PromQL language expressions, inside ES|QL queries.
This parsers uses the ANTLR4 grammar created and maintained by Elasticsearch,
however, the AST representation of the nodes follows the original PromQL AST structure
as defined in the Prometheus project.

## PromQL canonical grammar

Below are some excerpts from the official PromQL grammar, for reference.

```yacc
start           :
                START_METRIC metric
                | START_SERIES_DESCRIPTION series_description
                | START_EXPRESSION /* empty */ EOF
                | START_EXPRESSION expr
                | START_METRIC_SELECTOR vector_selector
                | start EOF
                | error /* If none of the more detailed error messages are triggered, we fall back to this. */
                ;

expr            :
                aggregate_expr
                | binary_expr
                | function_call
                | matrix_selector
                | number_duration_literal
                | offset_expr
                | anchored_expr
                | smoothed_expr
                | paren_expr
                | string_literal
                | subquery_expr
                | unary_expr
                | vector_selector
                | step_invariant_expr
                | duration_expr
                ;

/*
 * Aggregations.
 */

aggregate_expr  : aggregate_op aggregate_modifier function_call_body
                | aggregate_op function_call_body aggregate_modifier
                | aggregate_op function_call_body
                | aggregate_op error
                ;

aggregate_modifier:
                BY grouping_labels
                | WITHOUT grouping_labels
                ;

/*
 * Binary expressions.
 */

// Operator precedence only works if each of those is listed separately.
binary_expr     : expr ADD     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr ATAN2   bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr DIV     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr EQLC    bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr GTE     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr GTR     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr LAND    bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr LOR     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr LSS     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr LTE     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr LUNLESS bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr MOD     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr MUL     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr NEQ     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr POW     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                | expr SUB     bin_modifier expr { $$ = yylex.(*parser).newBinaryExpression($1, $2, $3, $4) }
                ;

// Using left recursion for the modifier rules, helps to keep the parser stack small and
// reduces allocations.
bin_modifier    : group_modifiers;

bool_modifier   : /* empty */
                | BOOL
                ;

on_or_ignoring  : bool_modifier IGNORING grouping_labels
                | bool_modifier ON grouping_labels
                ;

group_modifiers: bool_modifier /* empty */
                | on_or_ignoring /* empty */
                | on_or_ignoring GROUP_LEFT maybe_grouping_labels
                | on_or_ignoring GROUP_RIGHT maybe_grouping_labels
                ;


grouping_labels : LEFT_PAREN grouping_label_list RIGHT_PAREN
                | LEFT_PAREN grouping_label_list COMMA RIGHT_PAREN
                | LEFT_PAREN RIGHT_PAREN
                | error
                ;


grouping_label_list:
                grouping_label_list COMMA grouping_label
                | grouping_label
                | grouping_label_list error
                ;

grouping_label  : maybe_label
                | STRING
                | error
                ;

/*
 * Function calls.
 */

function_call   : IDENTIFIER function_call_body
                ;

function_call_body: LEFT_PAREN function_call_args RIGHT_PAREN
                | LEFT_PAREN RIGHT_PAREN
                ;

function_call_args: function_call_args COMMA expr
                | expr
                | function_call_args COMMA
                ;

/*
 * Expressions inside parentheses.
 */

paren_expr      : LEFT_PAREN expr RIGHT_PAREN
                ;

/*
 * Offset modifiers.
 */

positive_duration_expr : duration_expr
                ;

offset_expr: expr OFFSET offset_duration_expr
                | expr OFFSET error
                ;

/*
 * Anchored and smoothed modifiers
 */

anchored_expr: expr ANCHORED

smoothed_expr: expr SMOOTHED

/*
 * @ modifiers.
 */

step_invariant_expr: expr AT signed_or_unsigned_number
                | expr AT at_modifier_preprocessors LEFT_PAREN RIGHT_PAREN
                | expr AT errora
                ;

at_modifier_preprocessors: START | END;

/*
 * Subquery and range selectors.
 */

matrix_selector : expr LEFT_BRACKET positive_duration_expr RIGHT_BRACKET
                ;

subquery_expr   : expr LEFT_BRACKET positive_duration_expr COLON positive_duration_expr RIGHT_BRACKET
                | expr LEFT_BRACKET positive_duration_expr COLON RIGHT_BRACKET
                | expr LEFT_BRACKET positive_duration_expr COLON positive_duration_expr error
                | expr LEFT_BRACKET positive_duration_expr COLON error
                | expr LEFT_BRACKET positive_duration_expr error
                | expr LEFT_BRACKET error
                ;

/*
 * Unary expressions.
 */

unary_expr      :
                /* Gives the rule the same precedence as MUL. This aligns with mathematical conventions. */
                unary_op expr %prec MUL
                ;

/*
 * Vector selectors.
 */

vector_selector: metric_identifier label_matchers
                | metric_identifier
                | label_matchers
                ;

label_matchers  : LEFT_BRACE label_match_list RIGHT_BRACE
                | LEFT_BRACE label_match_list COMMA RIGHT_BRACE
                | LEFT_BRACE RIGHT_BRACE
                ;

label_match_list: label_match_list COMMA label_matcher
                | label_matcher
                | label_match_list error
                ;

label_matcher   : IDENTIFIER match_op STRING
                | string_identifier match_op STRING
                | string_identifier
                | string_identifier match_op error
                | IDENTIFIER match_op error
                | IDENTIFIER error
                | error
                ;

/*
 * Metric descriptions.
 */

metric          : metric_identifier label_set
                | label_set
                ;


metric_identifier: AVG | BOTTOMK | BY | COUNT | COUNT_VALUES | GROUP | IDENTIFIER |  LAND | LOR | LUNLESS | MAX | METRIC_IDENTIFIER | MIN | OFFSET | QUANTILE | STDDEV | STDVAR | SUM | TOPK | WITHOUT | START | END | LIMITK | LIMIT_RATIO | STEP | ANCHORED | SMOOTHED;

label_set       : LEFT_BRACE label_set_list RIGHT_BRACE
                | LEFT_BRACE label_set_list COMMA RIGHT_BRACE
                | LEFT_BRACE RIGHT_BRACE
                | /* empty */
                ;

label_set_list  : label_set_list COMMA label_set_item
                | label_set_item
                | label_set_list error
                ;

label_set_item  : IDENTIFIER EQL STRING
                | string_identifier EQL STRING
                | string_identifier
                | IDENTIFIER EQL error
                | string_identifier EQL error
                | IDENTIFIER error
                | error
                ;

/*
 * Series descriptions:
 * A separate language that is used to generate series values promtool.
 * It is included in the promQL parser, because it shares common functionality, such as parsing a metric.
 * The syntax is described in https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/#series
 */

series_description: metric series_values
                ;

series_values   : /*empty*/
                | series_values SPACE series_item
                | series_values SPACE
                | error
                ;

series_item     : BLANK
                | BLANK TIMES uint
                | series_value
                | series_value TIMES uint
                | series_value signed_number TIMES uint
                // Histogram descriptions (part of unit testing).
                | histogram_series_value
                | histogram_series_value TIMES uint
                | histogram_series_value ADD histogram_series_value TIMES uint
                | histogram_series_value SUB histogram_series_value TIMES uint
                ;

series_value    : IDENTIFIER
                | number
                | signed_number
                ;

histogram_series_value
                : OPEN_HIST histogram_desc_map SPACE CLOSE_HIST
                | OPEN_HIST histogram_desc_map CLOSE_HIST
                | OPEN_HIST SPACE CLOSE_HIST
                | OPEN_HIST CLOSE_HIST
                ;

histogram_desc_map
                : histogram_desc_map SPACE histogram_desc_item
                | histogram_desc_item
                | histogram_desc_map error
                ;

histogram_desc_item
                : SCHEMA_DESC COLON int
                | SUM_DESC COLON signed_or_unsigned_number
                | COUNT_DESC COLON signed_or_unsigned_number
                | ZERO_BUCKET_DESC COLON signed_or_unsigned_number
                | ZERO_BUCKET_WIDTH_DESC COLON number
                | CUSTOM_VALUES_DESC COLON bucket_set
                | BUCKETS_DESC COLON bucket_set
                | OFFSET_DESC COLON int
                | NEGATIVE_BUCKETS_DESC COLON bucket_set
                | NEGATIVE_OFFSET_DESC COLON int
                | COUNTER_RESET_HINT_DESC COLON counter_reset_hint
                ;

bucket_set      : LEFT_BRACKET bucket_set_list SPACE RIGHT_BRACKET
                | LEFT_BRACKET bucket_set_list RIGHT_BRACKET
                ;

bucket_set_list : bucket_set_list SPACE signed_or_unsigned_number
                | signed_or_unsigned_number
                | bucket_set_list error
                ;

counter_reset_hint : UNKNOWN_COUNTER_RESET | COUNTER_RESET | NOT_COUNTER_RESET | GAUGE_TYPE;

/*
 * Keyword lists.
 */

aggregate_op    : AVG | BOTTOMK | COUNT | COUNT_VALUES | GROUP | MAX | MIN | QUANTILE | STDDEV | STDVAR | SUM | TOPK | LIMITK | LIMIT_RATIO;

// Inside of grouping options label names can be recognized as keywords by the lexer. This is a list of keywords that could also be a label name.
maybe_label     : AVG | BOOL | BOTTOMK | BY | COUNT | COUNT_VALUES | GROUP | GROUP_LEFT | GROUP_RIGHT | IDENTIFIER | IGNORING | LAND | LOR | LUNLESS | MAX | METRIC_IDENTIFIER | MIN | OFFSET | ON | QUANTILE | STDDEV | STDVAR | SUM | TOPK | START | END | ATAN2 | LIMITK | LIMIT_RATIO | STEP | ANCHORED | SMOOTHED;

unary_op        : ADD | SUB;

match_op        : EQL | NEQ | EQL_REGEX | NEQ_REGEX ;

/*
 * Literals.
 */

number_duration_literal  : NUMBER
                        | DURATION
                ;

number          : NUMBER
                | DURATION
                ;

signed_number   : ADD number { $$ = $2 }
                | SUB number { $$ = -$2 }
                ;

signed_or_unsigned_number: number | signed_number ;

uint            : NUMBER ;

int             : SUB uint { $$ = -int64($2) }
                | uint { $$ = int64($1) }
                ;

string_literal  : STRING ;

string_identifier  : STRING ;

/*
 * Wrappers for optional arguments.
 */

maybe_grouping_labels: /* empty */ { $$ = nil }
                | grouping_labels
                ;

/*
 * Duration expressions.
 */

// offset_duration_expr is needed to handle expressions like "foo offset -2^2" correctly.
// Without this rule, such expressions would be parsed as "foo offset (-2^2)" due to operator precedence.
// With this rule, they are parsed as "(foo offset -2)^2", which is the expected behavior without parentheses.
offset_duration_expr    : number_duration_literal
                        | unary_op number_duration_literal
                        | STEP LEFT_PAREN RIGHT_PAREN
                        | unary_op STEP LEFT_PAREN RIGHT_PAREN
                        | min_max LEFT_PAREN duration_expr COMMA duration_expr RIGHT_PAREN
                        | unary_op min_max LEFT_PAREN duration_expr COMMA duration_expr RIGHT_PAREN
                        | unary_op LEFT_PAREN duration_expr RIGHT_PAREN %prec MUL
                        | duration_expr
                        ;

min_max: MIN | MAX ;

duration_expr   : number_duration_literal
                | unary_op duration_expr %prec MUL
                | duration_expr ADD duration_expr
                | duration_expr SUB duration_expr
                | duration_expr MUL duration_expr
                | duration_expr DIV duration_expr
                | duration_expr MOD duration_expr
                | duration_expr POW duration_expr
                | STEP LEFT_PAREN RIGHT_PAREN
                | min_max LEFT_PAREN duration_expr COMMA duration_expr RIGHT_PAREN
                | paren_duration_expr
                ;

paren_duration_expr : LEFT_PAREN duration_expr RIGHT_PAREN ;

%%

```
