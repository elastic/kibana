/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';

import CLASSIFY_LOGGING_CANDIDATES_YAML from './classify_logging_candidates.yaml';
import CLASSIFY_OTEL_CANDIDATES_YAML from './classify_otel_candidates.yaml';

interface ClassifyStep {
  name: string;
  with: {
    systemPrompt: string;
    schema: {
      properties: {
        results: { items: { properties: Record<string, unknown>; required: string[] } };
      };
    };
  };
}

const classifyStep = (yaml: string): ClassifyStep => {
  const parsed = parse(yaml) as { steps: ClassifyStep[] };
  const step = parsed.steps.find(({ name }) => name === 'classify');
  if (step === undefined) throw new Error('classify step is missing');
  return step;
};

/** The sentences a classifier needs to file a finding; both workflows must carry them verbatim. */
const findingSentences = [
  'Every result states findingType as none or sensitive-data.',
  "Use none when nothing about the line needs a reviewer's attention; a finding means a careful engineer should look at this exact source line, regardless of keep.",
  'Use sensitive-data when the line logs or attaches credentials, tokens, secrets, passwords, card data, or personal data such as email addresses.',
  'Anything else that merely looks wrong, including a questionable aggregation, leftover debug output, or a level that contradicts the message, is not a finding; answer with findingType none.',
  'Being a duplicate, not being a runtime emission, or being an ordinary message is a keep decision, not a finding; answer with keep and findingType none.',
  'When findingType is not none, also return findingTitle and findingSummary; when it is none, omit both.',
  'Never copy a secret, token, or password value into findingTitle or findingSummary; describe what is exposed, not its value.',
];

const findingSchema = {
  findingType: { enum: ['none', 'sensitive-data'] },
  findingTitle: { type: 'string', minLength: 1, maxLength: 160 },
  findingSummary: { type: 'string', minLength: 1, maxLength: 600 },
};

describe.each([
  ['logging', CLASSIFY_LOGGING_CANDIDATES_YAML],
  ['OTel', CLASSIFY_OTEL_CANDIDATES_YAML],
])('Code Intelligence %s classification finding rules', (_name, yaml) => {
  const step = classifyStep(yaml);

  it.each(findingSentences)('states: %s', (sentence) => {
    expect(step.with.systemPrompt).toContain(sentence);
  });

  it('lists the finding fields among the allowed result fields', () => {
    expect(step.with.systemPrompt).toMatch(
      /A result may contain only .*findingType, findingTitle, and findingSummary\./
    );
  });

  it('declares the finding properties with the shared bounds and requires an explicit findingType', () => {
    const { properties, required } = step.with.schema.properties.results.items;
    expect(properties).toMatchObject(findingSchema);
    expect(required).toContain('findingType');
  });
});
