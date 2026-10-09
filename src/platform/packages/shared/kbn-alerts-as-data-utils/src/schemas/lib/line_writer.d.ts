export declare class LineWriter {
    private _indent;
    private _lines;
    private _separator;
    constructor(separator?: string);
    addLine(line: string): void;
    addLineAndIndent(line: string): void;
    dedentAndAddLine(line: string): void;
    indent(): void;
    dedent(): void;
    getContent(): string;
}
export declare const createLineWriter: (separator?: string) => LineWriter;
