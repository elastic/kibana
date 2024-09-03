import { Lexer } from 'antlr4';

if (!Lexer) {
  throw new Error('Failed to import Lexer from antlr4');
}

export default class LexerConfig extends Lexer {
  constructor(...args) {
    super(...args);
  }

  isDevVersion() {
    return false;
  }
}
