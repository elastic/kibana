import type { Token } from 'antlr4';
import { default as PainlessLexer } from '../../antlr/painless_lexer';
export declare class PainlessLexerEnhanced extends PainlessLexer {
    private lastToken?;
    nextToken(): Token;
    isSlashRegex(): boolean;
}
