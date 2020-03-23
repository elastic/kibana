/*
 * Timelion syntax parser
 */

{
 function ltoo (literal) {
  return {type: 'literal', value: literal}
 }

 function simpleLocation (location) {
  // Returns an object representing the position of the function within the expression,
  // demarcated by the position of its first character and last character. We calculate these values
  // using the offset because the expression could span multiple lines, and we don't want to deal
  // with column and line values.
  return {
   min: location.start.offset,
   max: location.end.offset
  }
 }

 var currentFunction;
 var currentArgs = [];

 var functions = [];
 var args = [];
 var variables = {};

}

start
 = space? tree:series {
  return {
    tree: tree.filter(function (o) {return o != null}),
    functions: functions,
    args: args,
    variables: variables
  }
 }

arg_list
 = first:argument rest:(space? ',' space? arg:argument {return arg})* space? ','? {
  return [first].concat(rest);
 }

argument
 = name:argument_name space? '=' space? value:arg_type {
  var arg = {
   type: 'namedArg',
   name: name,
   value: value,
   location: simpleLocation(location()),
   text: text()
  };
  currentArgs.push(arg);
  return arg;
 }
 / space? '=' space? value:arg_type? {
  var exception = {
   type: 'incompleteArgument',
   currentArgs: currentArgs,
   currentFunction: currentFunction,
   location: simpleLocation(location()),
   text: text()
  }
  error(JSON.stringify(exception));
 }
 / name:argument_name space? '=' {
  var exception = {
   type: 'incompleteArgumentValue',
   currentArgs: currentArgs,
   currentFunction: currentFunction,
   name: name,
   location: simpleLocation(location()),
   text: text()
  }
  error(JSON.stringify(exception));
 }
 / element:arg_type {return element}

arg_type
 = variable_get
 / series_type
 / literal:literal {
  var result = ltoo(literal);
  result.location = simpleLocation(location()),
  result.text = text();
  return result;
 }

variable_get
 = '$' name:argument_name {
  if (variables[name]) {
   return variables[name];
  } else {
   error('$' + name + ' is not defined')
  }
 }

variable_set
 = '$' name:argument_name space? '=' space? value:arg_type {
  variables[name] = value;
 }

series_type
 = variable_set
 / variable_get
 / group
 / chain
 / reference

series
 = first:series_type rest:(space? ',' space? series:series_type {return series})* ','? {
  return [first].concat(rest)
 }

function_name
 = first:[a-zA-Z]+ rest:[.a-zA-Z0-9_-]* {
  currentFunction = first.join('') + rest.join('');
  currentArgs = [];
  return currentFunction;
}

argument_name
 = first:[a-zA-Z]+ rest:[.a-zA-Z0-9_-]* { return first.join('') + rest.join('') }

function "function"
 = space? '.' name:function_name space? '(' space? arg_list:arg_list? space? ')' space? {
  var result = {
    type: 'function',
    function: name,
    arguments: arg_list || [],
    location: simpleLocation(location()),
    text: text()
  }

  result.arguments.forEach(function (arg) {
   arg.function = name;
   args.push(arg);
  })

  functions.push(result)
  return result;
 }
 / '.' func:function_name? {
  var exception = {
   type: 'incompleteFunction',
   function: func,
   location: simpleLocation(location()),
   text: text()
  }
  error(JSON.stringify(exception));
 }

reference
 = '@' plot:integer ':' series:integer {
  return {
   type: 'reference',
   plot: plot,
   series: series
  }
 }
 / '@' plot:integer {
  return {
   type: 'reference',
   plot: plot
  }
 }


chain
 = func:function space? rest:function* {return {type: 'chain', chain: [func].concat(rest)}}

group
 = '(' space? grouped:series space? ')' functions:function* {
  var first = {
    type: 'chainList',
    list: grouped
  }
  first.label = text();

  return {type: "chain", chain: [first].concat(functions)};
 }

 /* ----- Core types ----- */

literal "literal"
  =  '"' chars:dq_char* '"' { return chars.join(''); } // double quoted string
  / "'" chars:sq_char* "'" { return chars.join(''); } // single quoted string
  / 'true'  { return true; } // unquoted literals from here down
  / 'false' { return false; }
  / 'null'  { return null; }
  / string:[^()"',=\ \t]+ { // this also matches numbers via Number()
   var result = string.join('');
   // Sort of hacky, but PEG doesn't have backtracking so
   // a number rule is hard to read, and performs worse
   if (isNaN(Number(result))) return result;
   return Number(result)
  }

space
 = [\ \t\r\n]+

dq_char
  = "\\" sequence:('"' / "\\") { return sequence; }
  / [^"] // everything except "

sq_char
  = "\\" sequence:("'" / "\\") { return sequence; }
  / [^'] // everything except '

integer
 = digits:[0-9]+ {return parseInt(digits.join(''))}
