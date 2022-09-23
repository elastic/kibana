/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Initialization block
{
  const { parseCursor, cursorSymbol, allowLeadingWildcards = true, helpers: { nodeTypes } } = options;
  const buildFunctionNode = nodeTypes.function.buildNodeWithArgumentNodes;
  const buildLiteralNode = nodeTypes.literal.buildNode;
  const buildWildcardNode = nodeTypes.wildcard.buildNode;
  const { KQL_WILDCARD_SYMBOL } = nodeTypes.wildcard;
}

start
  = Space* query:OrQuery? trailing:OptionalSpace {
    if (trailing.type === 'cursor') {
      return {
        ...trailing,
        suggestionTypes: ['conjunction']
      };
    }
    if (query !== null) return query;
    return nodeTypes.function.buildNode('is', '*', '*');
  }

OrQuery
  = head:AndQuery tail:(Or query:AndQuery { return query; })+ {
    const nodes = [head, ...tail];
    const cursor = parseCursor && nodes.find(node => node.type === 'cursor');
    if (cursor) return cursor;
    return buildFunctionNode('or', nodes);
  }
  / AndQuery

AndQuery
  = head:NotQuery tail:(And query:NotQuery { return query; })+ {
    const nodes = [head, ...tail];
    const cursor = parseCursor && nodes.find(node => node.type === 'cursor');
    if (cursor) return cursor;
    return buildFunctionNode('and', nodes);
  }
  / NotQuery

NotQuery
  = Not query:SubQuery {
    if (query.type === 'cursor') return query;
    return buildFunctionNode('not', [query]);
  }
  / SubQuery

SubQuery
  = '(' Space* query:OrQuery trailing:OptionalSpace ')' {
    if (trailing.type === 'cursor') {
      return {
        ...trailing,
        suggestionTypes: ['conjunction']
      };
    }
    return query;
  }
  / NestedQuery

NestedQuery
  = field:Field Space* ':' Space* '{' Space* query:OrQuery trailing:OptionalSpace '}' {
      if (query.type === 'cursor') {
        return {
          ...query,
          nestedPath: query.nestedPath ? `${field.value}.${query.nestedPath}` : field.value,
        }
      };

      if (trailing.type === 'cursor') {
        return {
          ...trailing,
          suggestionTypes: ['conjunction']
        };
      }
      return buildFunctionNode('nested', [field, query]);
    }
    / Expression

Expression
  = FieldRangeExpression
  / FieldValueExpression
  / ValueExpression

Field "fieldName"
  = Literal

FieldRangeExpression
  = field:Field Space* operator:RangeOperator Space* value:Literal {
    if (value.type === 'cursor') {
      return {
        ...value,
        suggestionTypes: ['conjunction']
      };
    }
    return buildFunctionNode('range', [field, operator, value]);
  }

FieldValueExpression
  = field:Field Space* ':' Space* partial:ListOfValues {
    if (partial.type === 'cursor') {
      return {
        ...partial,
        fieldName: field.value,
        suggestionTypes: ['value', 'conjunction']
      };
    }
    return partial(field);
  }

ValueExpression
  = partial:Value {
    if (partial.type === 'cursor') {
      const fieldName = `${partial.prefix}${partial.suffix}`.trim();
      return {
        ...partial,
        fieldName,
        suggestionTypes: ['field', 'operator', 'conjunction']
      };
    }
    const field = buildLiteralNode(null);
    return partial(field);
  }

ListOfValues
  = '(' Space* partial:OrListOfValues trailing:OptionalSpace ')' {
    if (trailing.type === 'cursor') {
      return {
        ...trailing,
        suggestionTypes: ['conjunction']
      };
    }
    return partial;
  }
  / Value

OrListOfValues
  = head:AndListOfValues tail:(Or partial:AndListOfValues { return partial; })+ {
    const nodes = [head, ...tail];
    const cursor = parseCursor && nodes.find(node => node.type === 'cursor');
    if (cursor) {
      return {
        ...cursor,
        suggestionTypes: ['value']
      };
    }
    return (field) => buildFunctionNode('or', nodes.map(partial => partial(field)));
  }
  / AndListOfValues

AndListOfValues
  = head:NotListOfValues tail:(And partial:NotListOfValues { return partial; })+ {
    const nodes = [head, ...tail];
    const cursor = parseCursor && nodes.find(node => node.type === 'cursor');
    if (cursor) {
      return {
        ...cursor,
        suggestionTypes: ['value']
      };
    }
    return (field) => buildFunctionNode('and', nodes.map(partial => partial(field)));
  }
  / NotListOfValues

NotListOfValues
  = Not partial:ListOfValues {
    if (partial.type === 'cursor') {
      return {
        ...list,
        suggestionTypes: ['value']
      };
    }
    return (field) => buildFunctionNode('not', [partial(field)]);
  }
  / ListOfValues

Value "value"
  = value:QuotedString {
    if (value.type === 'cursor') return value;
    return (field) => buildFunctionNode('is', [field, value]);
  }
  / value:UnquotedLiteral {
    if (value.type === 'cursor') return value;

    if (!allowLeadingWildcards && nodeTypes.wildcard.isNode(value) && nodeTypes.wildcard.hasLeadingWildcard(value)) {
      error('Leading wildcards are disabled. See query:allowLeadingWildcards in Advanced Settings.');
    }

    return (field) => buildFunctionNode('is', [field, value]);
  }

Or "OR"
  = Space+ 'or'i Space+

And "AND"
  = Space+ 'and'i Space+

Not "NOT"
  = 'not'i Space+

Literal "literal"
  = QuotedString / UnquotedLiteral

QuotedString
  = &{ return parseCursor; } '"' prefix:QuotedCharacter* cursor:Cursor suffix:QuotedCharacter* '"' {
    const { start, end } = location();
    return {
      type: 'cursor',
      start: start.offset,
      end: end.offset - cursor.length,
      prefix: prefix.join(''),
      suffix: suffix.join(''),
      text: text().replace(cursor, '')
    };
  }
  / '"' chars:QuotedCharacter* '"' {
    return buildLiteralNode(chars.join(''), true);
  }

QuotedCharacter
  = EscapedWhitespace
  / EscapedUnicodeSequence
  / '\\' char:[\\"] { return char; }
  / !Cursor char:[^"] { return char; }

UnquotedLiteral
  = &{ return parseCursor; } prefix:UnquotedCharacter* cursor:Cursor suffix:UnquotedCharacter* {
    const { start, end } = location();
    return {
      type: 'cursor',
      start: start.offset,
      end: end.offset - cursor.length,
      prefix: prefix.join(''),
      suffix: suffix.join(''),
      text: text().replace(cursor, '')
    };
  }
  / chars:UnquotedCharacter+ {
    const sequence = chars.join('').trim();
    if (sequence === 'null') return buildLiteralNode(null);
    if (sequence === 'true') return buildLiteralNode(true);
    if (sequence === 'false') return buildLiteralNode(false);
    if (chars.includes(KQL_WILDCARD_SYMBOL)) return buildWildcardNode(sequence);
    return buildLiteralNode(sequence);
  }

UnquotedCharacter
  = EscapedWhitespace
  / EscapedSpecialCharacter
  / EscapedUnicodeSequence
  / EscapedKeyword
  / Wildcard
  / !SpecialCharacter !Keyword !Cursor char:. { return char; }

Wildcard
  = '*' { return KQL_WILDCARD_SYMBOL; }

OptionalSpace
  = &{ return parseCursor; } prefix:Space* cursor:Cursor suffix:Space* {
    const { start, end } = location();
    return {
      type: 'cursor',
      start: start.offset,
      end: end.offset - cursor.length,
      prefix: prefix.join(''),
      suffix: suffix.join(''),
      text: text().replace(cursor, '')
    };
  }
  / Space*

EscapedWhitespace
  = '\\t' { return '\t'; }
  / '\\r' { return '\r'; }
  / '\\n' { return '\n'; }

EscapedSpecialCharacter
  = '\\' char:SpecialCharacter { return char; }

EscapedKeyword
  = '\\' keyword:('or'i / 'and'i / 'not'i) { return keyword; }

Keyword
  = Or / And / Not

SpecialCharacter
  = [\\():<>"*{}]

EscapedUnicodeSequence
 = '\\' sequence:UnicodeSequence { return sequence; }

UnicodeSequence
  = "u" digits:$(HexDigit HexDigit HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }

HexDigit
  = [0-9a-f]i

RangeOperator
  = '<=' { return 'lte'; }
  / '>=' { return 'gte'; }
  / '<' { return 'lt'; }
  / '>' { return 'gt'; }

Space "whitespace"
  = [\ \t\r\n\u00A0]

Cursor
  = &{ return parseCursor; } '@kuery-cursor@' { return cursorSymbol; }
