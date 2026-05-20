import type { Position } from './core_editor';
export interface Token {
    /**
     * The value of the token.
     *
     * Can be an empty string.
     */
    value: string;
    /**
     * The type of the token. E.g., "whitespace". All of the types are
     * enumerated by the token lexer.
     */
    type: string;
    /**
     * The position of the first character of the token.
     */
    position: Position;
}
