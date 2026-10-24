/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addReportToParameter } from './report_to_parameter';

const DEFAULT_POLICY =
  'camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()';

describe('addReportToParameter', () => {
  it('attaches the parameter to every directive of the default policy', () => {
    expect(addReportToParameter(DEFAULT_POLICY, 'violations-endpoint')).toEqual(
      'camera=();report-to=violations-endpoint, display-capture=();report-to=violations-endpoint, fullscreen=(self);report-to=violations-endpoint, geolocation=();report-to=violations-endpoint, microphone=();report-to=violations-endpoint, web-share=();report-to=violations-endpoint'
    );
  });

  it('attaches the parameter to a single directive', () => {
    expect(addReportToParameter('display-capture=(self)', 'endpoint')).toEqual(
      'display-capture=(self);report-to=endpoint'
    );
  });

  it('does not split on commas inside a quoted origin or an inner list', () => {
    expect(
      addReportToParameter('camera=(self "https://a.example,b"), geolocation=*', 'endpoint')
    ).toEqual(
      'camera=(self "https://a.example,b");report-to=endpoint, geolocation=*;report-to=endpoint'
    );
  });

  it('keeps parameters that a directive already carries', () => {
    expect(addReportToParameter('camera=();foo=bar, microphone=()', 'endpoint')).toEqual(
      'camera=();foo=bar;report-to=endpoint, microphone=();report-to=endpoint'
    );
  });

  it('leaves a directive alone when it already reports somewhere', () => {
    expect(
      addReportToParameter('camera=();report-to=elsewhere, microphone=()', 'endpoint')
    ).toEqual('camera=();report-to=elsewhere, microphone=();report-to=endpoint');
  });

  it('is idempotent', () => {
    const once = addReportToParameter(DEFAULT_POLICY, 'endpoint');
    expect(addReportToParameter(once, 'endpoint')).toEqual(once);
  });

  it('does not mistake a quoted string for an existing parameter', () => {
    expect(addReportToParameter('camera=("x;report-to=y")', 'endpoint')).toEqual(
      'camera=("x;report-to=y");report-to=endpoint'
    );
  });

  // Anything that does not split cleanly is sent the way it always was, so an operator's policy is
  // never made worse than it is today.
  it.each([
    ['an unbalanced inner list', 'camera=(self, microphone=()'],
    ['a stray closing parenthesis', 'camera=self), microphone=()'],
    ['an unterminated quoted string', 'camera=("https://example.com), microphone=()'],
    ['an empty member', 'camera=(),, microphone=()'],
    ['a trailing comma', 'camera=(), microphone=(),'],
  ])('falls back to appending once for %s', (_, policy) => {
    expect(addReportToParameter(policy, 'endpoint')).toEqual(`${policy};report-to=endpoint`);
  });

  // The endpoint name is not validated on every branch this fix ships to. Spreading an invalid
  // name across every directive would multiply whatever it injects, so it is appended once, exactly
  // as before.
  it.each([
    ['a comma', 'endpoint, camera=*'],
    ['a semicolon', 'endpoint;camera=*'],
    ['whitespace', 'violations endpoint'],
    ['a line break', 'endpoint\r\nX-Injected: 1'],
  ])('falls back to appending once when the endpoint name contains %s', (_, reportTo) => {
    expect(addReportToParameter(DEFAULT_POLICY, reportTo)).toEqual(
      `${DEFAULT_POLICY};report-to=${reportTo}`
    );
  });
});
