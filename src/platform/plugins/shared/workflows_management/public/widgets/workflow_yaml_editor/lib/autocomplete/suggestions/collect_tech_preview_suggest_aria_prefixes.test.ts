/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { collectTechPreviewSuggestAriaPrefixes } from './collect_tech_preview_suggest_aria_prefixes';

vi.mock('../../connectors_cache', () => {
  const mocked = {
    getCachedAllConnectors: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../trigger_schemas', () => {
  const mocked = {
    triggerSchemas: {
      getTriggerDefinitions: vi.fn(),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/workflows', () => {
  const mocked = {
    builtInStepDefinitions: [
      { id: 'workflow.execute' },
      { id: 'workflow.executeAsync' },
      { id: 'wait' },
    ],
    getBuiltInStepStability: vi.fn((type: string) => {
      if (type === 'workflow.execute' || type === 'workflow.executeAsync') {
        return 'tech_preview';
      }
      return undefined;
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../get_stability_note', async () => {
  const actual = await vi.importActual('../../get_stability_note');
  return {
    getExtensionStability: actual.getExtensionStability,
  };
});

vi.mock('../../../../../../common/step_schemas', () => {
  const mocked = {
    stepSchemas: {
      getAllRegisteredStepDefinitions: vi.fn(() => []),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../../../common/step_schemas', () => {
  const mocked = {
    stepSchemas: {
      getAllRegisteredStepDefinitions: vi.fn(() => []),
    },
  };
  return { ...mocked, default: mocked };
});

import { stepSchemas } from '../../../../../../common/step_schemas';
import { triggerSchemas } from '../../../../../trigger_schemas';
import { getCachedAllConnectors } from '../../connectors_cache';

describe('collectTechPreviewSuggestAriaPrefixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (triggerSchemas.getTriggerDefinitions as Mock).mockReturnValue([
      { id: 'cases.caseCreated', title: 'Cases - Case created', stability: 'tech_preview' },
    ]);
    (getCachedAllConnectors as Mock).mockReturnValue([
      {
        type: 'kibana.streams.list',
        summary: 'List Streams',
        stability: 'tech_preview',
      },
      {
        type: 'elasticsearch.search',
        stability: 'stable',
      },
    ]);
  });

  it('includes event-driven trigger ids and tech preview steps/connectors', () => {
    const prefixes = collectTechPreviewSuggestAriaPrefixes();

    expect(prefixes).toEqual(
      expect.arrayContaining([
        'cases.caseCreated',
        'Cases - Case created',
        'workflow.execute',
        'workflow.executeAsync',
        'kibana.streams.list',
      ])
    );
    expect(prefixes).not.toContain('elasticsearch.search');
  });

  it('includes dynamic connector display name prefixes', () => {
    (getCachedAllConnectors as Mock).mockReturnValue([
      {
        type: 'my.custom.connector',
        summary: 'My Custom connector',
        stability: 'tech_preview',
      },
    ]);

    const prefixes = collectTechPreviewSuggestAriaPrefixes();

    expect(prefixes).toContain('my.custom.connector');
    expect(prefixes).toContain('My Custom');
  });

  it('includes extension step ids marked tech preview', () => {
    (stepSchemas.getAllRegisteredStepDefinitions as Mock).mockReturnValue([
      { id: 'custom.stable', stability: 'stable' },
      { id: 'custom.experimental' },
    ]);

    const prefixes = collectTechPreviewSuggestAriaPrefixes();

    expect(prefixes).toContain('custom.experimental');
    expect(prefixes).not.toContain('custom.stable');
  });
});
