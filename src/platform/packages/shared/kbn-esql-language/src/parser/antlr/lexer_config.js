import { Lexer } from 'antlr4';

if (!Lexer) {
  throw new Error('Failed to import Lexer from antlr4');
}

export default class lexer_config extends Lexer {
  constructor(...args) {
    super(...args);
    this._promqlDepth = 0;
  }

  isDevVersion() {
    return true;
  }

  hasMetricsCommand() {
    return true;
  }

  // PromQL parenthesis depth tracking for nested parentheses in PromQL queries
  incPromqlDepth() {
    this._promqlDepth++;
  }

  decPromqlDepth() {
    this._promqlDepth--;
  }

  resetPromqlDepth() {
    this._promqlDepth = 0;
  }

  getPromqlDepth() {
    return this._promqlDepth;
  }

  isPromqlQuery() {
    return this._promqlDepth > 0;
  }
}
