# dtrace-provider - TODO

## FEATURES

### Structured Arguments

The current support for argument types is limited to "char *" and
"int", i.e. strings and integer types. Native string types in
Javascript are converted to raw C strings for use with DTrace. 

With support for dynamic types and translators from the host DTrace
implementation, it'd be possible to provide a mapping from Javascript
objects to C structs, which could then be inspected in D scripts.
