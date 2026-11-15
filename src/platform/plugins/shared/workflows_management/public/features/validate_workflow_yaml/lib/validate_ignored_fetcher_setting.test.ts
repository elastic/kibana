/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { IGNORED_KIBANA_FETCHER_SETTING_MESSAGE } from '@kbn/workflows';
import { validateIgnoredFetcherSetting } from './validate_ignored_fetcher_setting';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';

const KIBANA_FETCHER_YAML = [
  "version: '1'",
  'name: kibana-fetcher',
  'enabled: true',
  'triggers:',
  '  - type: manual',
  'steps:',
  '  - name: status',
  '    type: kibana.request',
  '    with:',
  '      method: GET',
  '      path: /api/status',
  '      fetcher:',
  '        skip_ssl_verification: true',
].join('\n');

const HTTP_FETCHER_YAML = [
  "version: '1'",
  'name: http-fetcher',
  'enabled: true',
  'triggers:',
  '  - type: manual',
  'steps:',
  '  - name: ping',
  '    type: http',
  '    with:',
  '      url: https://example.com',
  '      fetcher:',
  '        skip_ssl_verification: true',
].join('\n');

describe('validateIgnoredFetcherSetting', () => {
  it('warns on kibana step fetcher keys', () => {
    const { workflowLookup, yamlLineCounter } = performComputation(KIBANA_FETCHER_YAML);
    if (!workflowLookup || !yamlLineCounter) {
      throw new Error('Expected kibana fetcher fixture to parse');
    }

    const results = validateIgnoredFetcherSetting(workflowLookup, yamlLineCounter, true);

    expect(results).toEqual([
      expect.objectContaining({
        owner: 'deprecated-step-validation',
        ruleId: 'ignoredFetcherSetting',
        severity: 'warning',
        message: IGNORED_KIBANA_FETCHER_SETTING_MESSAGE,
      }),
    ]);
  });

  it('does not warn on kibana.request fetcher when the self-client path is off', () => {
    const { workflowLookup, yamlLineCounter } = performComputation(KIBANA_FETCHER_YAML);
    if (!workflowLookup || !yamlLineCounter) {
      throw new Error('Expected kibana fetcher fixture to parse');
    }

    expect(validateIgnoredFetcherSetting(workflowLookup, yamlLineCounter)).toEqual([]);
  });

  it('does not warn on generated kibana.* fetcher when the self-client flag is off', () => {
    const yaml = [
      "version: '1'",
      'name: kibana-generated-fetcher',
      'enabled: true',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: get-case',
      '    type: kibana.getCase',
      '    with:',
      '      caseId: test-case',
      '      fetcher:',
      '        skip_ssl_verification: true',
    ].join('\n');
    const { workflowLookup, yamlLineCounter } = performComputation(yaml);
    if (!workflowLookup || !yamlLineCounter) {
      throw new Error('Expected generated kibana fetcher fixture to parse');
    }

    expect(validateIgnoredFetcherSetting(workflowLookup, yamlLineCounter)).toEqual([]);
  });

  it('does not warn on http connector fetcher keys', () => {
    const { workflowLookup, yamlLineCounter } = performComputation(HTTP_FETCHER_YAML);
    if (!workflowLookup || !yamlLineCounter) {
      throw new Error('Expected http fetcher fixture to parse');
    }

    expect(validateIgnoredFetcherSetting(workflowLookup, yamlLineCounter)).toEqual([]);
  });

  it('returns no warnings when fetcher is absent', () => {
    const yaml = parseDocument(
      [
        "version: '1'",
        'name: kibana-plain',
        'enabled: true',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: status',
        '    type: kibana.request',
        '    with:',
        '      method: GET',
        '      path: /api/status',
      ].join('\n')
    ).toString();
    const { workflowLookup, yamlLineCounter } = performComputation(yaml);
    if (!workflowLookup || !yamlLineCounter) {
      throw new Error('Expected plain kibana fixture to parse');
    }

    expect(validateIgnoredFetcherSetting(workflowLookup, yamlLineCounter)).toEqual([]);
  });
});
