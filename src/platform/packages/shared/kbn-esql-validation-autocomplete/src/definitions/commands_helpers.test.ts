/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractDissectColumnNames, extractSemanticsFromGrok } from './commands_helpers';

describe('helpers', () => {
  describe('recognizeDissectColumns', () => {
    it('should extract column names from dissect patterns', () => {
      const pattern1 = '%{key1}-%{key2}-%{key3}-%{key4}-%{bytes}';
      const columns1 = extractDissectColumnNames(pattern1);
      expect(columns1).toStrictEqual(['key1', 'key2', 'key3', 'key4', 'bytes']);

      const pattern2 = '%{user.id}-%{user.name}-%{user.email}';
      const columns2 = extractDissectColumnNames(pattern2);
      expect(columns2).toStrictEqual(['user.id', 'user.name', 'user.email']);

      const pattern3 = 'prefix-%{field1}-%{field2}-suffix';
      const columns3 = extractDissectColumnNames(pattern3);
      expect(columns3).toStrictEqual(['field1', 'field2']);

      const pattern4 = 'No columns here';
      const columns4 = extractDissectColumnNames(pattern4);
      expect(columns4).toStrictEqual([]);

      const pattern5 = '%{}-%{}-%{field}'; // empty key names
      const columns5 = extractDissectColumnNames(pattern5);
      expect(columns5).toStrictEqual(['field']);

      const pattern6 = '%{?ecs}{?version}/%{message}';
      const columns6 = extractDissectColumnNames(pattern6);
      expect(columns6).toStrictEqual(['ecs', 'message']);

      const pattern7 = '%{fieldA}###%{fieldB}###%{fieldC}';
      const columns7 = extractDissectColumnNames(pattern7);
      expect(columns7).toStrictEqual(['fieldA', 'fieldB', 'fieldC']);

      const pattern9 = '%%{field1}%%{field2}'; // Separator is '%'
      const columns9 = extractDissectColumnNames(pattern9);
      expect(columns9).toStrictEqual(['field1', 'field2']);

      const pattern10 = '%{firstWord}-%{secondWord}';
      const columns10 = extractDissectColumnNames(pattern10);
      expect(columns10).toStrictEqual(['firstWord', 'secondWord']);

      const pattern11 = '"""%{date} - %{msg} - %{ip}"""';
      const columns11 = extractDissectColumnNames(pattern11);
      expect(columns11).toStrictEqual(['date', 'msg', 'ip']);

      const pattern12 = '"""%{ts->} %{level}"""';
      const columns12 = extractDissectColumnNames(pattern12);
      expect(columns12).toStrictEqual(['ts', 'level']);

      const pattern13 = '"""%{+name} %{+name} %{+name} %{+name}"""';
      const columns13 = extractDissectColumnNames(pattern13);
      expect(columns13).toStrictEqual(['name']);

      const pattern14 = '"""%{clientip} %{?ident} %{?auth} %{@timestamp}"""';
      const columns14 = extractDissectColumnNames(pattern14);
      expect(columns14).toStrictEqual(['clientip', 'ident', 'auth', '@timestamp']);
    });
  });

  describe('extractSemanticsFromGrok', () => {
    it('should extract column names from grok patterns', () => {
      const pattern1 = '%{IP:ip} [%{TIMESTAMP_ISO8601:@timestamp}] %{GREEDYDATA:status}';
      const columns1 = extractSemanticsFromGrok(pattern1);
      expect(columns1).toStrictEqual(['ip', '@timestamp', 'status']);

      const pattern2 = '%{WORD:word1} - %{NUMBER:count}';
      const columns2 = extractSemanticsFromGrok(pattern2);
      expect(columns2).toStrictEqual(['word1', 'count']);

      const pattern3 = 'Some plain text without grok patterns';
      const columns3 = extractSemanticsFromGrok(pattern3);
      expect(columns3).toStrictEqual([]);
    });
  });
});
