# PromQL parser

This is a parser for embedded PromQL language expressions, inside ES|QL queries.
This parser uses the ANTLR4 grammar created and maintained by Elasticsearch,
however, the AST representation does not exactly match that of the original PromQL
language, as it is adapted to fit the Elasticsearch ANTLR grammar. The ES|QL PromQL
language support is also a subset of the full PromQL language.
