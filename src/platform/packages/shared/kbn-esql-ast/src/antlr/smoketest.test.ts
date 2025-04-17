import { CharStream, CommonTokenStream } from 'antlr4';
import { default as ESQLLexer } from './esql_lexer';
import { default as ESQLParser } from '../antlr/esql_parser';
import { GRAMMAR_ROOT_RULE } from '../parser/constants';
import { ESQLErrorListener } from '../parser';

describe('ES|QL Lexer/Parser', () => {
  it('should lex a simple query', () => {
    const text = 'FROM an_index';
    const lexer = new ESQLLexer(new CharStream(text));

    const stream = new CommonTokenStream(lexer);

    stream.fill();

    const symbolicNames = stream.tokens.map((token) => lexer.symbolicNames[token.type]);

    expect(symbolicNames).toEqual(['FROM', 'FROM_WS', 'UNQUOTED_SOURCE', undefined]);
  });

  it('should match token numbers between lexer and parser', () => {
    expect(ESQLLexer.FROM).toEqual(ESQLParser.FROM);
    expect(ESQLLexer.RENAME).toEqual(ESQLParser.RENAME);
    expect(ESQLLexer.PIPE).toEqual(ESQLParser.PIPE);
    expect(ESQLLexer.LAST).toEqual(ESQLParser.LAST);
    expect(ESQLLexer.SLASH).toEqual(ESQLParser.SLASH);
  });

  it('should parse a simple query', () => {
    const text = 'FROM an_index';
    const lexer = new ESQLLexer(new CharStream(text));
    const stream = new CommonTokenStream(lexer);

    const parser = new ESQLParser(stream);

    const errorListener = new ESQLErrorListener();
    parser.removeErrorListeners();
    parser.addErrorListener(errorListener);

    parser[GRAMMAR_ROOT_RULE]();

    expect(errorListener.getErrors()).toHaveLength(0);
  });
});
