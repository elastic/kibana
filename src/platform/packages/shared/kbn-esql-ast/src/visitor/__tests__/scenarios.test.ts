/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @category Visitor Real-world Scenarios
 *
 * This test suite contains real-world scenarios that demonstrate how to use the
 * visitor to traverse the AST and make changes to it, or how to extract useful
 */

import { parse } from '../../parser';
import { ESQLAstItem, ESQLAstQueryExpression } from '../../types';
import { Visitor } from '../visitor';

test('change LIMIT from 24 to 42', () => {
  const { root } = parse(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | LIMIT 24
  `);

  // Find the LIMIT node
  const limit = () =>
    new Visitor()
      .on('visitLimitCommand', (ctx) => ctx.numeric())
      .on('visitCommand', () => null)
      .on('visitQuery', (ctx) => [...ctx.visitCommands()])
      .visitQuery(root)
      .filter(Boolean)[0];

  expect(limit()).toBe(24);

  // Change LIMIT to 42
  new Visitor()
    .on('visitLimitCommand', (ctx) => {
      ctx.setLimit(42);
    })
    .on('visitCommand', () => {})
    .on('visitQuery', (ctx) => [...ctx.visitCommands()])
    .visitQuery(root);

  expect(limit()).toBe(42);
});

/**
 * Implement this once sorting order expressions are available:
 *
 * - https://github.com/elastic/kibana/issues/189491
 */
test.todo('can modify sorting orders');

test('can remove a specific WHERE command', () => {
  const query = parse(`
    FROM employees
      | KEEP first_name, last_name, still_hired
      | WHERE still_hired == true
      | WHERE last_name == "Jeo"
      | WHERE 123 == salary
  `);

  const print = () =>
    new Visitor()
      .on('visitExpression', (ctx) => '<expr>')
      .on('visitColumnExpression', (ctx) => ctx.node.name)
      .on(
        'visitFunctionCallExpression',
        (ctx) => `${ctx.node.name}(${[...ctx.visitArguments()].join(', ')})`
      )
      .on('visitCommand', (ctx) => {
        if (ctx.node.name === 'where') {
          const args = [...ctx.visitArguments()].join(', ');
          return `${ctx.name()}${args ? ` ${args}` : ''}`;
        } else {
          return '';
        }
      })
      .on('visitQuery', (ctx) => [...ctx.visitCommands()].filter(Boolean).join(' | '))
      .visitQuery(query.ast);

  const removeFilter = (field: string) => {
    query.ast = new Visitor()
      .on('visitExpression', (ctx) => ctx.node)
      .on('visitColumnExpression', (ctx) => (ctx.node.name === field ? null : ctx.node))
      .on('visitFunctionCallExpression', (ctx) => {
        const args = [...ctx.visitArguments()];
        return args.some((arg) => arg === null) ? null : ctx.node;
      })
      .on('visitCommand', (ctx) => {
        if (ctx.node.name === 'where') {
          ctx.node.args = [...ctx.visitArguments()].filter(Boolean) as ESQLAstItem[];
        }
        return ctx.node;
      })
      .on('visitQuery', (ctx) => [...ctx.visitCommands()].filter((cmd) => cmd.args.length))
      .visitQuery(query.ast);
  };

  expect(print()).toBe(
    'WHERE ==(still_hired, <expr>) | WHERE ==(last_name, <expr>) | WHERE ==(<expr>, salary)'
  );
  removeFilter('last_name');
  expect(print()).toBe('WHERE ==(still_hired, <expr>) | WHERE ==(<expr>, salary)');
  removeFilter('still_hired');
  removeFilter('still_hired');
  expect(print()).toBe('WHERE ==(<expr>, salary)');
  removeFilter('still_hired');
  removeFilter('salary');
  removeFilter('salary');
  expect(print()).toBe('');
});

export const prettyPrint = (ast: ESQLAstQueryExpression | ESQLAstQueryExpression['commands']) =>
  new Visitor()
    .on('visitExpression', (ctx) => {
      return '<EXPRESSION>';
    })
    .on('visitSourceExpression', (ctx) => {
      return ctx.node.name;
    })
    .on('visitColumnExpression', (ctx) => {
      return ctx.node.name;
    })
    .on('visitFunctionCallExpression', (ctx) => {
      let args = '';
      for (const arg of ctx.visitArguments()) {
        args += (args ? ', ' : '') + arg;
      }
      return `${ctx.node.name.toUpperCase()}${args ? `(${args})` : ''}`;
    })
    .on('visitLiteralExpression', (ctx) => {
      return ctx.node.value;
    })
    .on('visitListLiteralExpression', (ctx) => {
      return '<LIST>';
    })
    .on('visitTimeIntervalLiteralExpression', (ctx) => {
      return '<TIME_INTERVAL>';
    })
    .on('visitInlineCastExpression', (ctx) => {
      return '<CAST>';
    })
    .on('visitCommandOption', (ctx) => {
      let args = '';
      for (const arg of ctx.visitArguments()) {
        args += (args ? ', ' : '') + arg;
      }
      return ctx.node.name.toUpperCase() + (args ? ` ${args}` : '');
    })
    .on('visitCommand', (ctx) => {
      let args = '';
      for (const source of ctx.visitArguments()) {
        args += (args ? ', ' : '') + source;
      }
      return `${ctx.node.name.toUpperCase()}${args ? ` ${args}` : ''}`;
    })
    .on('visitFromCommand', (ctx) => {
      let sources = '';
      for (const source of ctx.visitSources()) {
        sources += (sources ? ', ' : '') + source;
      }
      let options = '';
      for (const option of ctx.visitOptions()) {
        options += ' ' + option;
      }
      return `FROM ${sources}${options}`;
    })
    .on('visitLimitCommand', (ctx) => {
      return `LIMIT ${ctx.numeric() ?? 0}`;
    })
    .on('visitQuery', (ctx) => {
      let text = '';
      for (const cmd of ctx.visitCommands()) {
        text += (text ? ' | ' : '') + cmd;
      }
      return text;
    })
    .visitQuery(ast);

test('can print a query to text', () => {
  const { ast } = parse(
    'FROM index METADATA _id, asdf, 123 | STATS fn([1,2], 1d, 1::string, x in (1, 2)), a = b | LIMIT 1000'
  );
  const text = prettyPrint(ast);

  expect(text).toBe(
    'FROM index METADATA _id, asdf, 123 | STATS FN(<LIST>, <TIME_INTERVAL>, <CAST>, IN(x, 1, 2)), =(a, b) | LIMIT 1000'
  );
});
