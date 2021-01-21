/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { extractHtmlMessages } from './html';

const htmlSourceBuffer = Buffer.from(`
<div name="dashboard">
  <div>
    <p
      i18n-id="kbn.dashboard.id-1"
      i18n-default-message="Message text 1 {value}"
      i18n-description="Message description 1"
      i18n-values="{
        value: 'Multiline
                string',
      }"
    ></p>
  </div>
  <div>
    {{ 'kbn.dashboard.id-2' | i18n: { defaultMessage: 'Message text 2' } }}
  </div>
  <div>
    {{ 'kbn.dashboard.id-3' | i18n: { defaultMessage: 'Message text 3', description: 'Message description 3' } }}
  </div>
</div>
`);

const report = jest.fn();

describe('dev/i18n/extractors/html', () => {
  beforeEach(() => {
    report.mockClear();
  });

  test('extracts default messages from HTML', () => {
    const actual = Array.from(extractHtmlMessages(htmlSourceBuffer));
    expect(actual.sort()).toMatchSnapshot();
  });

  test('extracts default messages from HTML with one-time binding', () => {
    const actual = Array.from(
      extractHtmlMessages(`
<div>
  {{::'kbn.id' | i18n: { defaultMessage: 'Message text with {value}', values: { value: 'value' } }}}
</div>
`)
    );
    expect(actual.sort()).toMatchSnapshot();
  });

  test('throws on empty i18n-id', () => {
    const source = Buffer.from(`\
<p
  i18n-id=""
  i18n-default-message="Message text"
  i18n-description="Message description"
></p>
`);

    expect(() => extractHtmlMessages(source, { report }).next()).not.toThrow();
    expect(report.mock.calls).toMatchSnapshot();
  });

  test('throws on missing i18n-default-message attribute', () => {
    const source = Buffer.from(`\
<p
  i18n-id="message-id"
></p>
`);

    expect(() => extractHtmlMessages(source, { report }).next()).not.toThrow();
    expect(report.mock.calls).toMatchSnapshot();
  });

  test('throws on i18n filter usage in complex angular expression', () => {
    const source = Buffer.from(`\
<div
  ng-options="mode as ('metricVis.colorModes.' + mode | i18n: { defaultMessage: mode }) for mode in collections.metricColorMode"
></div>
`);

    expect(() => extractHtmlMessages(source, { report }).next()).not.toThrow();
    expect(report.mock.calls).toMatchSnapshot();
  });

  test('extracts message from i18n filter in interpolating directive', () => {
    const source = Buffer.from(`
<icon-tip
  content="::'namespace.messageId' | i18n: {
    defaultMessage: 'Message'
  }"
  position="'right'"
></icon-tip>
`);

    expect(Array.from(extractHtmlMessages(source))).toMatchSnapshot();
  });
});
