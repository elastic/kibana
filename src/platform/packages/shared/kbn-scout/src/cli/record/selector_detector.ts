/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SelectorMapping } from './types';

/**
 * Detects data-test-subj attributes from generated code
 *
 * Note: This is a basic implementation that extracts data-test-subj values
 * from the generated Playwright code. A more advanced implementation would
 * inject a script into the browser during recording to build a comprehensive
 * mapping of CSS selectors to data-test-subj attributes.
 */
export function detectSelectorsFromCode(playwrightCode: string): SelectorMapping[] {
  const mappings: SelectorMapping[] = [];

  // Pattern to match data-test-subj in selectors like:
  // page.locator('[data-test-subj="saveButton"]')
  // page.click('[data-test-subj="saveButton"]')
  const testSubjPattern = /\[data-test-subj=["']([^"']+)["']\]/g;

  let match;
  while ((match = testSubjPattern.exec(playwrightCode)) !== null) {
    const testSubj = match[1];
    const cssSelector = `[data-test-subj="${testSubj}"]`;

    // Add to mappings if not already present
    if (!mappings.find((m) => m.testSubj === testSubj)) {
      mappings.push({
        cssSelector,
        testSubj,
      });
    }
  }

  return mappings;
}

/**
 * Extracts common Kibana selector patterns that might have data-test-subj equivalents
 *
 * This function identifies common selector patterns in Kibana that typically have
 * data-test-subj attributes, even if Playwright didn't capture them directly.
 */
export function detectKibanaPatterns(playwrightCode: string): SelectorMapping[] {
  const mappings: SelectorMapping[] = [];

  // Common Kibana button patterns
  const commonPatterns: Array<{ pattern: RegExp; testSubj: string }> = [
    { pattern: /button.*save/i, testSubj: 'saveButton' },
    { pattern: /button.*cancel/i, testSubj: 'cancelButton' },
    { pattern: /button.*delete/i, testSubj: 'deleteButton' },
    { pattern: /button.*add/i, testSubj: 'addButton' },
    { pattern: /button.*create/i, testSubj: 'createButton' },
    { pattern: /\.euiButton/i, testSubj: 'euiButton' },
    { pattern: /\.euiFieldText/i, testSubj: 'textInput' },
  ];

  for (const { pattern, testSubj } of commonPatterns) {
    if (pattern.test(playwrightCode)) {
      // This is a suggestion - the actual selector might be different
      mappings.push({
        cssSelector: pattern.source,
        testSubj: `${testSubj} /* VERIFY: This is a suggested mapping */`,
      });
    }
  }

  return mappings;
}

/**
 * Builds a comprehensive set of selector mappings by combining different detection methods
 */
export function buildSelectorMappings(playwrightCode: string): SelectorMapping[] {
  const explicitMappings = detectSelectorsFromCode(playwrightCode);
  const suggestedMappings = detectKibanaPatterns(playwrightCode);

  // Return explicit mappings first (they're more reliable)
  return [...explicitMappings, ...suggestedMappings];
}
