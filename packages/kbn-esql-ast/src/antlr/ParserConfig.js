import { Parser } from 'antlr4';

if (!Parser) {
  throw new Error('Failed to import Parser from antlr4');
}

export default class ParserConfig extends Parser {
  constructor(input) {
    super(input);
  }

  devVersion() {
    return false;
  }
}
