import { Parser } from 'antlr4';

if (!Parser) {
  throw new Error('Failed to import Parser from antlr4');
}

export default class parser_config extends Parser {
  constructor(...args) {
    super(...args);
  }

  isDevVersion() {
    return true;
  }
}
