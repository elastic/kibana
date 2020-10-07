# @kbn/babel-code-parser

Simple abstraction over the `@babel/parser` and the `@babel/traverse` in order 
to build a code parser on top.

We have two main functions `parseSingleFile` (sync and sync version) and the 
`parseEntries` (only async version). The first one just parse one entry file
and the second one parses recursively all the files from a list of 
start entry points.

Then we have `visitors` and `strategies`. The first ones are basically the
`visitors` to use into the ast from the `@babel/traverse`. They are the only
way to collect info when using the `parseSingleFile`. The `strategies` are
meant to be used with the `parseEntries` and configures the info we want
to collect from our parsed code. After each loop, one per entry file, the
`parseEntries` method will call the given `strategy` expecting that 
`strategy` would call the desired visitors, assemble the important 
information to collect and adds them to the final results.

