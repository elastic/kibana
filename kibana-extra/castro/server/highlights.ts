import { CodeLine } from "model";

const Highlights = require('highlights');
const highlighter = new Highlights();
const Selector = require('first-mate-select-grammar');

highlighter.loadGrammarsSync();

const selector = Selector();

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

export function render(lines: CodeLine[]) : string{
    let output = "<pre class='code'>";
    let lineNum = 0;
    for(let line of lines) {

        output += `<div class='code-line' data-line="${lineNum}">`;
        for(let token of line){
            let lastScope = token.scopes[token.scopes.length - 1];
            const clazz = lastScope.replace(/\./g, " ");
            output += `<span data-range="${token.range.start},${token.range.end}" class="${clazz}">${highlighter.escapeString(token.value)}</span>`
        }
        output += "\n</div>";
        lineNum ++;
    }

    return output + "</pre>"
}