/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { XmlElement } from './xml';

describe('XmlElement', () => {
  it('serializes nested elements with an XML declaration', () => {
    const root = new XmlElement('testsuites', { name: 'ftr', tests: 2 });
    const suite = root.ele('testsuite', { name: 'suite' });
    suite.ele('testcase', { name: 'passes', time: '0.001' });
    suite.ele('testcase', { name: 'skips' }).ele('skipped');

    expect(root.end()).toBe(
      '<?xml version="1.0" encoding="utf-8"?>' +
        '<testsuites name="ftr" tests="2"><testsuite name="suite">' +
        '<testcase name="passes" time="0.001"/>' +
        '<testcase name="skips"><skipped/></testcase>' +
        '</testsuite></testsuites>'
    );
  });

  it('skips null and undefined attributes but keeps falsy values', () => {
    const el = new XmlElement('el', { a: null, b: undefined, c: 0, d: false, e: '' });
    expect(el.toString()).toBe('<el c="0" d="false" e=""/>');
  });

  it('escapes attribute values and strips invalid XML characters', () => {
    const el = new XmlElement('el', { v: 'a "b" <c> & d\n\te\r\u0000f' });
    expect(el.toString()).toBe('<el v="a &quot;b&quot; &lt;c> &amp; d&#xA;&#x9;e&#xD;f"/>');
  });

  it('writes text as CDATA and splits "]]>" sequences', () => {
    const el = new XmlElement('failure').dat('oops ]]> <b>&');
    expect(el.toString()).toBe('<failure><![CDATA[oops ]]]]><![CDATA[> <b>&]]></failure>');
  });
});
