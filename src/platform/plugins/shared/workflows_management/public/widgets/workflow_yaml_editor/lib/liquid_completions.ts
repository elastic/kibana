/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';

// Common Liquid filters with descriptions
export const LIQUID_FILTERS = [
  {
    name: 'abs',
    description: 'Returns the absolute value of a number',
    insertText: 'abs',
    example: '{{ -17 | abs }} => 17',
  },
  {
    name: 'append',
    description: 'Concatenates two strings and returns the concatenated value',
    insertText: 'append: "${1:string}"',
    example: '{{ "Hello" | append: " World" }} => Hello World',
  },
  {
    name: 'at_least',
    description: 'Limits a number to a minimum value',
    insertText: 'at_least: ${1:number}',
    example: '{{ 4 | at_least: 5 }} => 5',
  },
  {
    name: 'at_most',
    description: 'Limits a number to a maximum value',
    insertText: 'at_most: ${1:number}',
    example: '{{ 4 | at_most: 5 }} => 4',
  },
  {
    name: 'capitalize',
    description: 'Capitalizes the first letter of a string',
    insertText: 'capitalize',
    example: '{{ "hello world" | capitalize }} => Hello world',
  },
  {
    name: 'ceil',
    description: 'Rounds a number up to the nearest integer',
    insertText: 'ceil',
    example: '{{ 1.2 | ceil }} => 2',
  },
  {
    name: 'compact',
    description: 'Removes any null values from an array',
    insertText: 'compact',
    example: '{{ array | compact }}',
  },
  {
    name: 'concat',
    description: 'Concatenates (joins) multiple arrays',
    insertText: 'concat: ${1:array}',
    example: '{{ array1 | concat: array2 }}',
  },
  {
    name: 'date',
    description: 'Formats a date',
    insertText: 'date: "${1:%Y-%m-%d}"',
    example: '{{ "now" | date: "%Y-%m-%d" }}',
  },
  {
    name: 'default',
    description: "Allows you to specify a fallback in case a value doesn't exist",
    insertText: 'default: "${1:fallback}"',
    example: '{{ product.title | default: "No title" }}',
  },
  {
    name: 'divided_by',
    description: 'Divides a number by another number',
    insertText: 'divided_by: ${1:number}',
    example: '{{ 16 | divided_by: 4 }} => 4',
  },
  {
    name: 'downcase',
    description: 'Converts a string to lowercase',
    insertText: 'downcase',
    example: '{{ "HELLO" | downcase }} => hello',
  },
  {
    name: 'dump',
    description: 'Converts an object to a JSON string',
    insertText: 'dump',
    example: '{{ object | dump }}',
  },
  {
    name: 'escape',
    description: 'Escapes a string by replacing characters with escape sequences',
    insertText: 'escape',
    example: '{{ "<p>text</p>" | escape }}',
  },
  {
    name: 'first',
    description: 'Returns the first item of an array',
    insertText: 'first',
    example: '{{ array | first }}',
  },
  {
    name: 'floor',
    description: 'Rounds a number down to the nearest integer',
    insertText: 'floor',
    example: '{{ 1.9 | floor }} => 1',
  },
  {
    name: 'join',
    description: 'Combines the items in an array into a single string',
    insertText: 'join: "${1:separator}"',
    example: '{{ array | join: ", " }}',
  },
  {
    name: 'json',
    description: 'Converts a value to JSON',
    insertText: 'json',
    example: '{{ object | json }}',
  },
  {
    name: 'last',
    description: 'Returns the last item of an array',
    insertText: 'last',
    example: '{{ array | last }}',
  },
  {
    name: 'lstrip',
    description: 'Removes all whitespace from the beginning of a string',
    insertText: 'lstrip',
    example: '{{ "   hello" | lstrip }} => "hello"',
  },
  {
    name: 'map',
    description:
      'Creates an array of values by extracting the values of a named property from another object',
    insertText: 'map: "${1:property}"',
    example: '{{ products | map: "title" }}',
  },
  {
    name: 'minus',
    description: 'Subtracts a number from another number',
    insertText: 'minus: ${1:number}',
    example: '{{ 4 | minus: 2 }} => 2',
  },
  {
    name: 'modulo',
    description: 'Returns the remainder of a division operation',
    insertText: 'modulo: ${1:number}',
    example: '{{ 3 | modulo: 2 }} => 1',
  },
  {
    name: 'newline_to_br',
    description: 'Replaces every newline in a string with an HTML line break',
    insertText: 'newline_to_br',
    example: '{{ string | newline_to_br }}',
  },
  {
    name: 'plus',
    description: 'Adds a number to another number',
    insertText: 'plus: ${1:number}',
    example: '{{ 4 | plus: 2 }} => 6',
  },
  {
    name: 'prepend',
    description: 'Adds the specified string to the beginning of another string',
    insertText: 'prepend: "${1:string}"',
    example: '{{ "apples" | prepend: "Some " }} => "Some apples"',
  },
  {
    name: 'remove',
    description: 'Removes every occurrence of the specified substring from a string',
    insertText: 'remove: "${1:string}"',
    example: '{{ "Hello world" | remove: "l" }} => "Heo word"',
  },
  {
    name: 'remove_first',
    description: 'Removes only the first occurrence of the specified substring from a string',
    insertText: 'remove_first: "${1:string}"',
    example: '{{ "Hello world" | remove_first: "l" }} => "Helo world"',
  },
  {
    name: 'replace',
    description:
      'Replaces every occurrence of the first argument in a string with the second argument',
    insertText: 'replace: "${1:search}", "${2:replace}"',
    example: '{{ "Take my money" | replace: "my", "your" }}',
  },
  {
    name: 'replace_first',
    description:
      'Replaces only the first occurrence of the first argument in a string with the second argument',
    insertText: 'replace_first: "${1:search}", "${2:replace}"',
    example: '{{ "Take my money" | replace_first: "my", "your" }}',
  },
  {
    name: 'reverse',
    description: 'Reverses the order of the items in an array',
    insertText: 'reverse',
    example: '{{ array | reverse }}',
  },
  {
    name: 'round',
    description: 'Rounds a number to the nearest integer or specified number of decimals',
    insertText: 'round: ${1:decimals}',
    example: '{{ 1.2 | round }} => 1',
  },
  {
    name: 'rstrip',
    description: 'Removes all whitespace from the end of a string',
    insertText: 'rstrip',
    example: '{{ "hello   " | rstrip }} => "hello"',
  },
  {
    name: 'size',
    description: 'Returns the number of characters in a string or the number of items in an array',
    insertText: 'size',
    example: '{{ "hello" | size }} => 5',
  },
  {
    name: 'slice',
    description: 'Returns a substring or subarray',
    insertText: 'slice: ${1:start}, ${2:length}',
    example: '{{ "hello" | slice: 0, 3 }} => "hel"',
  },
  {
    name: 'sort',
    description: 'Sorts items in an array by a given attribute',
    insertText: 'sort: "${1:property}"',
    example: '{{ array | sort: "name" }}',
  },
  {
    name: 'split',
    description: 'Divides a string into an array using the argument as a separator',
    insertText: 'split: "${1:separator}"',
    example: '{{ "a,b,c" | split: "," }} => ["a", "b", "c"]',
  },
  {
    name: 'strip',
    description: 'Removes all whitespace from both the left and right sides of a string',
    insertText: 'strip',
    example: '{{ "  hello  " | strip }} => "hello"',
  },
  {
    name: 'strip_html',
    description: 'Removes any HTML tags from a string',
    insertText: 'strip_html',
    example: '{{ "<p>Hello</p>" | strip_html }} => "Hello"',
  },
  {
    name: 'strip_newlines',
    description: 'Removes any newline characters from a string',
    insertText: 'strip_newlines',
    example: '{{ string | strip_newlines }}',
  },
  {
    name: 'times',
    description: 'Multiplies a number by another number',
    insertText: 'times: ${1:number}',
    example: '{{ 3 | times: 2 }} => 6',
  },
  {
    name: 'truncate',
    description: 'Shortens a string down to the number of characters passed as an argument',
    insertText: 'truncate: ${1:length}',
    example: '{{ "Ground control to Major Tom" | truncate: 20 }}',
  },
  {
    name: 'truncatewords',
    description: 'Shortens a string down to the number of words passed as an argument',
    insertText: 'truncatewords: ${1:words}',
    example: '{{ "Ground control to Major Tom" | truncatewords: 3 }}',
  },
  {
    name: 'uniq',
    description: 'Removes any duplicate elements in an array',
    insertText: 'uniq',
    example: '{{ array | uniq }}',
  },
  {
    name: 'upcase',
    description: 'Converts a string to uppercase',
    insertText: 'upcase',
    example: '{{ "hello" | upcase }} => "HELLO"',
  },
  {
    name: 'url_encode',
    description: 'Converts any URL-unsafe characters in a string into percent-encoded characters',
    insertText: 'url_encode',
    example: '{{ "hello world" | url_encode }} => "hello%20world"',
  },
  {
    name: 'where',
    description: 'Filters an array to only include items with a specific property value',
    insertText: 'where: "${1:property}", "${2:value}"',
    example: '{{ products | where: "type", "book" }}',
  },
];

/**
 * Creates Monaco completion items for Liquid filters
 */
export function createLiquidFilterCompletions(
  range: monaco.IRange,
  filterPrefix?: string
): monaco.languages.CompletionItem[] {
  const filteredFilters = filterPrefix
    ? LIQUID_FILTERS.filter((filter) =>
        filter.name.toLowerCase().startsWith(filterPrefix.toLowerCase())
      )
    : LIQUID_FILTERS;

  return filteredFilters.map((filter) => ({
    label: filter.name,
    kind: monaco.languages.CompletionItemKind.Function,
    detail: filter.description,
    documentation: {
      value: `**${filter.name}**\n\n${filter.description}\n\n**Example:**\n\`\`\`liquid\n${filter.example}\n\`\`\``,
      isTrusted: true,
    },
    insertText: filter.insertText,
    insertTextRules: filter.insertText.includes('$')
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : monaco.languages.CompletionItemInsertTextRule.None,
    range,
    sortText: filter.name, // Ensures alphabetical sorting
  }));
}

// Liquid block keywords that can be used inside {%- liquid ... -%} blocks
export const LIQUID_BLOCK_KEYWORDS = [
  {
    name: 'assign',
    description: 'Creates a new variable',
    insertText: 'assign ${1:variable} = ${2:value}',
    example: 'assign message = "Hello World"',
  },
  {
    name: 'echo',
    description: 'Outputs the value of a variable',
    insertText: 'echo ${1:variable}',
    example: 'echo message',
  },
  {
    name: 'case',
    description: 'Creates a switch statement',
    insertText:
      'case ${1:variable}\n  when ${2:value}\n    ${3:content}\n  else\n    ${4:default_content}\nendcase',
    example:
      'case alert_type\n  when "critical"\n    assign message = "Critical alert"\n  else\n    assign message = "Normal alert"\nendcase',
  },
  {
    name: 'when',
    description: 'Defines a condition in a case statement',
    insertText: 'when ${1:value}\n  ${2:content}',
    example: 'when "critical"\n  assign message = "Critical"',
  },
  {
    name: 'else',
    description: 'Defines the default case',
    insertText: 'else\n  ${1:content}',
    example: 'else\n  assign message = "Default"',
  },
  {
    name: 'if',
    description: 'Creates a conditional statement',
    insertText: 'if ${1:condition}\n  ${2:content}\nendif',
    example: 'if user.active\n  echo "User is active"\nendif',
  },
  {
    name: 'unless',
    description: 'Creates a negative conditional statement',
    insertText: 'unless ${1:condition}\n  ${2:content}\nendunless',
    example: 'unless user.banned\n  echo "User is allowed"\nendunless',
  },
  {
    name: 'elsif',
    description: 'Additional condition in an if statement',
    insertText: 'elsif ${1:condition}',
    example: 'elsif user.premium',
  },
  {
    name: 'for',
    description: 'Creates a for loop',
    insertText: 'for ${1:item} in ${2:collection}\n  ${3:content}\nendfor',
    example: 'for product in products\n  echo product.name\nendfor',
  },
  {
    name: 'break',
    description: 'Exits a for loop early',
    insertText: 'break',
    example: 'break',
  },
  {
    name: 'continue',
    description: 'Skips the current iteration of a for loop',
    insertText: 'continue',
    example: 'continue',
  },
  {
    name: 'capture',
    description: 'Captures string output and assigns it to a variable',
    insertText: 'capture ${1:variable}\n  ${2:content}\nendcapture',
    example: 'capture greeting\n  echo "Hello " + user.name\nendcapture',
  },
  {
    name: 'comment',
    description: 'Creates a comment block',
    insertText: 'comment\n  ${1:comment_text}\nendcomment',
    example: 'comment\n  This is a comment\nendcomment',
  },
];

/**
 * Creates completion items for Liquid block keywords (used inside {%- liquid ... -%} blocks)
 */
export function createLiquidBlockKeywordCompletions(
  range: monaco.IRange,
  keywordPrefix?: string
): monaco.languages.CompletionItem[] {
  const filteredKeywords = keywordPrefix
    ? LIQUID_BLOCK_KEYWORDS.filter((keyword) =>
        keyword.name.toLowerCase().startsWith(keywordPrefix.toLowerCase())
      )
    : LIQUID_BLOCK_KEYWORDS;

  return filteredKeywords.map((keyword) => ({
    label: keyword.name,
    kind: monaco.languages.CompletionItemKind.Keyword,
    detail: keyword.description,
    documentation: {
      value: `**${keyword.name}**\n\n${keyword.description}\n\n**Example:**\n\`\`\`liquid\n${keyword.example}\n\`\`\``,
      isTrusted: true,
    },
    insertText: keyword.insertText,
    insertTextRules: keyword.insertText.includes('$')
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : monaco.languages.CompletionItemInsertTextRule.None,
    range,
    sortText: keyword.name,
  }));
}

/**
 * Creates completion items for common Liquid syntax
 */
export function createLiquidSyntaxCompletions(
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  return [
    {
      label: 'liquid',
      kind: monaco.languages.CompletionItemKind.Keyword,
      detail: 'Liquid block',
      documentation: 'Creates a liquid block for multiple liquid statements without tag wrappers',
      insertText: ' liquid\n  ${1:assign variable = value}\n  ${2:echo variable}\n-%}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: 'if',
      kind: monaco.languages.CompletionItemKind.Keyword,
      detail: 'Liquid if statement',
      documentation: 'Creates a conditional statement',
      insertText: 'if ${1:condition} %}\n  ${2:content}\n{% endif %}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: 'unless',
      kind: monaco.languages.CompletionItemKind.Keyword,
      detail: 'Liquid unless statement',
      documentation: 'Creates a conditional statement (opposite of if)',
      insertText: 'unless ${1:condition} %}\n  ${2:content}\n{% endunless %}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: 'for',
      kind: monaco.languages.CompletionItemKind.Keyword,
      detail: 'Liquid for loop',
      documentation: 'Creates a for loop',
      insertText: 'for ${1:item} in ${2:collection} %}\n  ${3:content}\n{% endfor %}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
    {
      label: 'case',
      kind: monaco.languages.CompletionItemKind.Keyword,
      detail: 'Liquid case statement',
      documentation: 'Creates a switch-like statement',
      insertText: 'case ${1:variable} %}\n{% when ${2:value} %}\n  ${3:content}\n{% endcase %}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
    },
  ];
}
