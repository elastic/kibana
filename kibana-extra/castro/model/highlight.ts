export interface CodeLine extends Array<Token> {
}

export interface Token {
    value: string
    scopes: string[]
    range?: Range
}

export interface Range {
    start: number // start pos in line
    end: number
    pos?: number  // position in file
}