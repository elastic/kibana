import type { Recognizer, RecognitionException } from 'antlr4';
import { ErrorListener } from 'antlr4';
import type { MonacoEditorError } from '../types';
export declare class ANTLRErrorListener extends ErrorListener<any> {
    protected errors: MonacoEditorError[];
    syntaxError(recognizer: Recognizer<any>, offendingSymbol: any, line: number, column: number, message: string, error: RecognitionException | undefined): void;
    getErrors(): MonacoEditorError[];
}
