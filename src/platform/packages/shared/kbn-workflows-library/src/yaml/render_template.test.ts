/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseTemplateYaml } from './parse_template';
import { renderTemplate } from './render_template';

const TEMPLATE_WITH_COMMENTS = `template-metadata:
  slug: ip-reputation-check
  version: "1.1.0"
  availability: ">=9.5.0 <9.6.0"
  name: "IP Reputation Check"
  description: "Assess the reputation of an IP address."
  categories: [enrichment]
  # this comment lives inside the metadata block and must be removed
  install:
    form:
      - name: abuseipdb-connector
        inputType: connector
        connectorType: .abuseipdb
      - name: max-age-in-days
        inputType: number
        default: 30

# a top-level body comment that must be preserved
consts:
  # nested body comment
  threshold: 50
steps:
  - name: query_abuseipdb
    type: abuseipdb.checkIp
    connector-id: __install__.abuseipdb-connector
    with:
      maxAgeInDays: __install__.max-age-in-days
      note: "score for __install__.abuseipdb-connector"
`;

describe('renderTemplate', () => {
  it('should remove the template-metadata block and its inner comments', () => {
    const template = parseTemplateYaml(TEMPLATE_WITH_COMMENTS);
    const result = renderTemplate({ template });

    expect(result).not.toContain('template-metadata');
    expect(result).not.toContain('lives inside the metadata block');
    expect(result.startsWith('# a top-level body comment that must be preserved')).toBe(true);
  });

  it('should preserve body comments and indentation', () => {
    const template = parseTemplateYaml(TEMPLATE_WITH_COMMENTS);
    const result = renderTemplate({ template });

    expect(result).toContain('# a top-level body comment that must be preserved');
    expect(result).toContain('  # nested body comment');
    expect(result).toContain('    connector-id:');
    expect(result).toContain('      maxAgeInDays:');
  });

  it('should replace a placeholder with the provided value', () => {
    const template = parseTemplateYaml(TEMPLATE_WITH_COMMENTS);
    const result = renderTemplate({
      template,
      values: { 'abuseipdb-connector': 'my-connector-id' },
    });

    expect(result).toContain('connector-id: my-connector-id');
    expect(result).toContain('note: "score for my-connector-id"');
  });

  it('should fall back to the install-form default when no value is provided', () => {
    const template = parseTemplateYaml(TEMPLATE_WITH_COMMENTS);
    const result = renderTemplate({ template });

    expect(result).toContain('maxAgeInDays: 30');
  });

  it('should emit the <name> placeholder when there is no value and no default', () => {
    const template = parseTemplateYaml(TEMPLATE_WITH_COMMENTS);
    const result = renderTemplate({ template });

    expect(result).toContain('connector-id: <abuseipdb-connector>');
    expect(result).toContain('note: "score for <abuseipdb-connector>"');
  });

  it('should prefer a provided value over the field default', () => {
    const template = parseTemplateYaml(TEMPLATE_WITH_COMMENTS);
    const result = renderTemplate({ template, values: { 'max-age-in-days': 7 } });

    expect(result).toContain('maxAgeInDays: 7');
    expect(result).not.toContain('maxAgeInDays: 30');
  });

  it('should leave the workflow body untouched apart from placeholders', () => {
    const template = parseTemplateYaml(TEMPLATE_WITH_COMMENTS);
    const result = renderTemplate({ template });

    expect(result).toContain('threshold: 50');
    expect(result).toContain('type: abuseipdb.checkIp');
  });

  it('should preserve a top-level comment placed above the metadata block', () => {
    const raw = `# license header comment
template-metadata:
  slug: noop
  version: "1.0.0"
  availability: ">=9.5.0"
  name: "Noop"
  description: "Does nothing."
  categories: [utility]
steps:
  - name: noop
    type: noop
`;
    const template = parseTemplateYaml(raw);
    const result = renderTemplate({ template });

    expect(result.startsWith('# license header comment')).toBe(true);
    expect(result).not.toContain('template-metadata');
    expect(result).toContain('type: noop');
  });
});
