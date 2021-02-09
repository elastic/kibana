// tinymath parsing grammar

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
  = _ literal:(Number / VariableWithQuote / Variable) _ {
    return literal;
  }

Variable
  = _ first:StartChar rest:ValidChar* _ { // We can open this up later. Strict for now.
    return first + rest.join('');
  }

VariableWithQuote
  = _ Quote first:StartChar mid:(Space* ValidChar+)* Quote _ {
    return first + mid.map(m => m[0].join('') + m[1].join('')).join('')
  }

// expressions

Expression
  = AddSubtract

AddSubtract
  = _ left:MultiplyDivide rest:(('+' / '-') MultiplyDivide)* _ {
    return rest.reduce((acc, curr) => ({
      name: curr[0] === '+' ? 'add' : 'subtract',
      args: [acc, curr[1]]
    }), left)
  }

MultiplyDivide
  = _ left:Factor rest:(('*' / '/') Factor)* _ {
    return rest.reduce((acc, curr) => ({
      name: curr[0] === '*' ? 'multiply' : 'divide',
      args: [acc, curr[1]]
    }), left)
  }

Factor
  = Group
  / Function
  / Literal

Group
  = _ '(' _ expr:Expression _ ')' _ {
    return expr
  }

Arguments "arguments"
  = _ first:Expression rest:(_ ',' _ arg:Expression {return arg})* _ ','? _ {
    return [first].concat(rest);
  }

Function "function"
  = _ name:[a-z]+ '(' _ args:Arguments? _ ')' _ {
    return {name: name.join(''), args: args || []};
  }

// Numbers. Lol.

Number "number"
  = '-'? Integer Fraction? Exp? { return parseFloat(text()); }

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
