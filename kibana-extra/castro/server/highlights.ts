const Highlights = require('highlights');
const highlighter = new Highlights();
const Selector = require('first-mate-select-grammar');
import {DocumentSymbolParams, SymbolInformation} from "vscode-languageserver";

highlighter.loadGrammarsSync();

const selector = Selector();

interface CodeLine extends Array<Token> {
}

interface Token {
    value: string
    scopes: string[]
    range?: Range
}

interface Range {
    start: number // start pos in line
    end: number
    pos?: number  // position in file
}


export function tokenizeLines(filePath: string, fileContents: string): CodeLine[] {
    const grammar = selector.selectGrammar(highlighter.registry, filePath, fileContents);
    if (grammar) {
        return grammar.tokenizeLines(fileContents);
    } else {
        return [];
    }
}

export function computeRanges(lines: CodeLine[]) {
    let pos = 0;
    for (let line of lines) {
        let start = 0;

        for (let token of line) {
            let len = token.value.length;
            token.range = {
                start,
                end: start + len,
                pos
            };
            start += len;
            pos += len;
        }
        pos += 1;  // line break
    }
}

export function mergeSymbols(codeLines: CodeLine[], symbols: SymbolInformation[]) {
    for (const symbol of symbols) {
        const {start, end} = symbol.location.range;
        const codeLine = codeLines[start.line];
        if (codeLine) {
            for (const token of codeLine) {
                if (token.range.start == start.character && token.range.end == end.character) {
                    token.scopes.push('symbol')
                }
            }
        }
    }
}

export function render(lines: CodeLine[]) : string{
    let output = "<pre class='code'>";
    for(let line of lines) {
        output += "<div class='code-line'>";
        for(let token of line){
            let lastScope = token.scopes[token.scopes.length - 1];
            const clazz = lastScope.replace(/\./g, " ");
            output += `<span class="${clazz}">${highlighter.escapeString(token.value)}</span>`
        }
        output += "\n</div>";
    }

    return output + "</pre>"
}