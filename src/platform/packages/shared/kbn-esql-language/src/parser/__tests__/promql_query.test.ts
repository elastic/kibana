/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import { printAst } from '../../debug';
import type { ESQLAstPromqlCommand } from '../../types';

/**
 * ```
 * PROMQL <params>? (valueName =)? ( <query> )
 * PROMQL <params>? <query>
 * ```
 */
describe('basic <query> parsing in PROMQL command', () => {
  describe('no params', () => {
    it('can parse basic <query>', () => {
      const text = `PROMQL bytes_in`;
      const query = EsqlQuery.fromSrc(text);

      expect('\n' + printAst((query.ast.commands[0] as ESQLAstPromqlCommand).query!)).toBe(`
query 7-14
└─ selector 7-14 "bytes_in"
   └─ identifier 7-14 "bytes_in"`);
    });

    it('( <query> ) - in parens', () => {
      const text = `PROMQL (bytes_in)`;
      const query = EsqlQuery.fromSrc(text);

      expect('\n' + printAst(query.ast)).toBe(`
query 0-16
└─ command 0-16 "promql"
   └─ parens 7-16
      └─ query 8-15
         └─ selector 8-15 "bytes_in"
            └─ identifier 8-15 "bytes_in"`);
    });

    it('name = ( <query> ) - named query', () => {
      const text = `PROMQL name = (bytes_in)`;
      const query = EsqlQuery.fromSrc(text);

      expect('\n' + printAst(query.ast)).toBe(`
query 0-23
└─ command 0-23 "promql"
   └─ function 7-23 "="
      ├─ identifier 7-10 "name"
      └─ parens 14-23
         └─ query 15-22
            └─ selector 15-22 "bytes_in"
               └─ identifier 15-22 "bytes_in"`);
    });
  });

  describe('with params', () => {
    it('can parse basic <query>', () => {
      const text = `PROMQL k = v bytes_in`;
      const query = EsqlQuery.fromSrc(text);

      expect('\n' + printAst((query.ast.commands[0] as ESQLAstPromqlCommand).query!)).toBe(`
query 13-20
└─ selector 13-20 "bytes_in"
   └─ identifier 13-20 "bytes_in"`);
    });

    it('( <query> ) - in parens', () => {
      const text = `PROMQL  k=v ( bytes_in )`;
      const query = EsqlQuery.fromSrc(text);

      expect('\n' + printAst((query.ast.commands[0] as ESQLAstPromqlCommand).query!)).toBe(`
parens 12-23
└─ query 14-21
   └─ selector 14-21 "bytes_in"
      └─ identifier 14-21 "bytes_in"`);
    });

    it('name = ( <query> ) - named query', () => {
      const text = `PROMQL k = v name = ( bytes_in )`;
      const query = EsqlQuery.fromSrc(text);

      expect('\n' + printAst((query.ast.commands[0] as ESQLAstPromqlCommand).query!)).toBe(`
function 13-31 "="
├─ identifier 13-16 "name"
└─ parens 20-31
   └─ query 22-29
      └─ selector 22-29 "bytes_in"
         └─ identifier 22-29 "bytes_in"`);
    });
  });
});

describe('PromQL sub-query deep parsing', () => {
  it('parses PromQL AST', () => {
    const text = `PROMQL hello = ?world bytes_in{job="prometheus"}`;
    const query = EsqlQuery.fromSrc(text);

    expect('\n' + printAst((query.ast.commands[0] as ESQLAstPromqlCommand).query!)).toBe(`
query 22-47
└─ selector 22-47 "bytes_in"
   ├─ identifier 22-29 "bytes_in"
   └─ label-map 31-46
      └─ label 31-46 "job"
         ├─ identifier 31-33 "job"
         └─ literal 35-46 ""prometheus""`);
  });
});

describe('invalid query', () => {
  it('propagates incomplete flag on unclosed quote', () => {
    const text = `PROMQL bytes_in{job="prometheus}`;
    const query = EsqlQuery.fromSrc(text);

    expect(query.errors.length > 0).toBe(true);
    expect('\n' + printAst(query.ast.commands[0])).toBe(`
command 0-19 "promql"
└─ query 7-19 INCOMPLETE
   └─ selector 7-19 "bytes_in" INCOMPLETE
      ├─ identifier 7-14 "bytes_in"
      └─ label-map 16-19 INCOMPLETE
         └─ label 16-19 "job" INCOMPLETE
            └─ identifier 16-18 "job"`);
  });
});
