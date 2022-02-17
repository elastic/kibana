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

Expression
  = AddSubtract

AddSubtract
  = _ left:MultiplyDivide rest:(('+' / '-') MultiplyDivide)+ _ {
    const topLevel = rest.reduce((acc, curr) => ({
      type: 'function',
      name: curr[0] === '+' ? 'add' : 'subtract',
      args: [acc, curr[1]],
    }), left);
    if (typeof topLevel === 'object') {
      topLevel.location = simpleLocation(location());
      topLevel.text = text();
    }
    return topLevel;
  }
  / MultiplyDivide

MultiplyDivide
  = _ left:Factor rest:(('*' / '/') Factor)* _ {
    const topLevel = rest.reduce((acc, curr) => ({
      type: 'function',
      name: curr[0] === '*' ? 'multiply' : 'divide',
      args: [acc, curr[1]],
    }), left);
    if (typeof topLevel === 'object') {
      topLevel.location = simpleLocation(location());
      topLevel.text = text();
    }
    return topLevel;
  }
  / Factor

Factor
  = Group
  / Function
  / Literal

Group
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
