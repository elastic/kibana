// tinymath parsing grammar

{
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

  const symbolsToFn = {
    '+': 'add', '-': 'subtract',
    '*': 'multiply', '/': 'divide',
    '<': 'lt', '>': 'gt', '==': 'eq',
    '<=': 'lte', '>=': 'gte',
  }

  // Shared function for AST operations
  function parseSymbol(left, rest){
    const topLevel = rest.reduce((acc, [name, right]) => ({
      type: 'function',
      name: symbolsToFn[name],
      args: [acc, right],
    }), left);
    if (typeof topLevel === 'object') {
      topLevel.location = simpleLocation(location());
      topLevel.text = text();
    }
    return topLevel;
  }
  
  // op is always defined, while eq can be null for gt and lt cases
  function getComparisonSymbol([op, eq]){
    return symbolsToFn[op+(eq || '')];
  }
}

start
  = Expression

// characters

_ "whitespace"
  = [ \t\n\r]*

Space
  = [ ]

Quote
  = [\"\']

StartChar
  = [A-Za-z_@.\[\]-]

ValidChar
  = [0-9A-Za-z._@\[\]-]

// literals and variables

Literal "literal"
  = _ literal:(Number / Variable) _ {
    return literal;
  }

// Quoted variables are interpreted as strings
// but unquoted variables are more restrictive
Variable
  = _ '"' chars:("\\\"" { return "\""; } / [^"])* '"' _ {
    return {
      type: 'variable',
      value: chars.join(''),
      location: simpleLocation(location()),
      text: text()
    };
  }
  / _ "'" chars:("\\\'" { return "\'"; } / [^'])* "'" _ {
      return {
      type: 'variable',
      value: chars.join(''),
      location: simpleLocation(location()),
      text: text()
    };
  }
  / _ rest:ValidChar+ _ {
    return {
      type: 'variable',
      value: rest.join(''),
      location: simpleLocation(location()),
      text: text()
    };
  }

// expressions

// An Expression can be of 3 different types:
// * a Comparison operation, which can contain recursive MathOperations inside
// * a MathOperation, which can contain other MathOperations, but not Comparison types
// * an ExpressionGroup, which is a generic Grouping that contains also Comparison operations (i.e. ( 5 > 1))
Expression
  = Comparison 
  / MathOperation
  / ExpressionGroup

Comparison
  = _ left:MathOperation op:(('>' / '<')('=')? / '=''=') right:MathOperation _ {
    return {
      type: 'function',
      name: getComparisonSymbol(op),
      args: [left, right],
      location: simpleLocation(location()),
      text: text()
    };
  }

MathOperation 
  = AddSubtract
  / MultiplyDivide
  / Factor

AddSubtract
  = _ left:MultiplyDivide rest:(('+' / '-') MultiplyDivide)+ _ {
    return parseSymbol(left, rest, {'+': 'add', '-': 'subtract'});
  }

MultiplyDivide
  = _ left:Factor rest:(('*' / '/') Factor)* _ {
    return parseSymbol(left, rest, {'*': 'multiply', '/': 'divide'});
  }

Factor
  = Group
  / Function
  / Literal

// Because of the new Comparison syntax it is required a new Group type
// the previous Group has been renamed into ExpressionGroup while
// a new Group type has been defined to exclude the Comparison type from it
Group
  = _ '(' _ expr:MathOperation _ ')' _ {
    return expr
  }
  
ExpressionGroup
  = _ '(' _ expr:Expression _ ')' _ {
    return expr
  }

Argument_List "arguments"
  = first:Argument rest:(_ ',' _ arg:Argument {return arg})* _ ','? {
    return [first].concat(rest);
  }

String
  = '"' chars:("\\\"" { return "\""; } / [^"])* '"' { return chars.join(''); }
  / "'" chars:("\\\'" { return "\'"; } / [^'])* "'" { return chars.join(''); }
  / chars:(ValidChar)+ { return chars.join(''); }

Argument
 = name:[a-zA-Z_]+ _ '=' _ value:(Number / String) _ {
  return {
    type: 'namedArgument',
    name: name.join(''),
    value: value,
    location: simpleLocation(location()),
    text: text()
  };
 }
 / arg:Expression

Function "function"
  = _ name:[a-zA-Z_-]+ '(' _ args:Argument_List? _ ')' _ {
    return {
      type: 'function',
      name: name.join(''),
      args: args || [],
      location: simpleLocation(location()),
      text: text()
    };
  }

// Numbers. Lol.

Number "number"
  = '-'? Integer Fraction? Exp? {
    return parseFloat(text());
  }

E
  = [eE]

Exp "exponent"
  = E '-'? Digit+

Fraction
  = '.' Digit+

Integer
  = '0'
  / ([1-9] Digit*)

Digit
  = [0-9]
