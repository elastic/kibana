/*
* Canvas syntax parser
*
* You MUST use PegJS to generate a .js file to use this.
* Yes, technically you can load this and build the parser in real time, but this makes it annoying
* to share the grammar between the front end and back, so, you know, just generate the parser.
* You shouldn't be futzing around in the grammar very often anyway.
*
* Instructions for generating `grammar.json`: https://github.com/elastic/kibana/issues/28776#issue-399489673
*
*/

{
  function addMeta(node, text, { start: { offset: start }, end: { offset: end } }) {
    if (!options.addMeta) return node;
    return { node, text, start, end };
  }
}

/* ----- Expressions ----- */

start
  = expression

expression
  = space? first:function? rest:('|' space? fn:function { return fn; })* {
    return addMeta({
      type: 'expression',
      chain: first ? [first].concat(rest) : []
    }, text(), location());
  }

/* ----- Functions ----- */

function "function"
  = name:identifier arg_list:arg_list {
    return addMeta({
      type: 'function',
      function: name,
      arguments: arg_list
    }, text(), location());
  }

/* ----- Arguments ----- */

argument_assignment
  = name:identifier space? '=' space? value:argument {
    return { name, value };
  }
  / value:argument {
    return { name: '_', value };
  }

argument
  = '$'? '{' expression:expression '}' { return expression; }
  / value:literal {
    return addMeta(value, text(), location());
  }

arg_list
  = args:(space arg:argument_assignment { return arg; })* space? {
    return args.reduce((accumulator, { name, value }) => ({
      ...accumulator,
      [name]: (accumulator[name] || []).concat(value)
    }), {});
  }

/* ----- Core types ----- */

identifier
  = name:[a-zA-Z0-9_-]+ {
    return name.join('');
  }

literal "literal"
  = phrase
  / unquoted_string_or_number

phrase
  = '"' chars:dq_char* '"' { return chars.join(''); } // double quoted string
  / "'" chars:sq_char* "'" { return chars.join(''); } // single quoted string

unquoted_string_or_number
  // Make sure we're not matching the beginning of a search
  = string:unquoted+ { // this also matches nulls, booleans, and numbers
    var result = string.join('');
    // Sort of hacky, but PEG doesn't have backtracking so
    // a null/boolean/number rule is hard to read, and performs worse
    if (result === 'null') return null;
    if (result === 'true') return true;
    if (result === 'false') return false;
    if (isNaN(Number(result))) return result; // 5bears
    return Number(result);
  }

space
  = [\ \t\r\n]+

unquoted
  = "\\" sequence:([\"'(){}<>\[\]$`|=\ \t\n\r] / "\\") { return sequence; }
  / [^"'(){}<>\[\]$`|=\ \t\n\r]

dq_char
  = "\\" sequence:('"' / "\\") { return sequence; }
  / [^"] // everything except "

sq_char
  = "\\" sequence:("'" / "\\") { return sequence; }
  / [^'] // everything except '
