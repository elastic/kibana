/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { classifyConnectorRelease } = require('./connector_release_check');

const PNC_A = 'a'.repeat(40);
const PNC_B = 'b'.repeat(40);

// A connector whose exposure this PR changes. `missingFromRefs` lists the PNC refs it is not
// registered in; empty means it is registered in every one of them.
const applicable = (id, supportedFeatureIds, missingFromRefs = [PNC_A]) => ({
  id,
  supportedFeatureIds,
  missingFromRefs,
});

const resolved = (refs = [PNC_A]) => ({ refs });

describe('classifyConnectorRelease', () => {
  describe('normal rollout (every slice on the same version)', () => {
    it('reports unsafe for a connector missing from the release that declares a feature', () => {
      const { status, findings } = classifyConnectorRelease(
        [applicable('.new', ['workflows'])],
        resolved()
      );

      expect(status).toBe('unsafe');
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe('.new');
      expect(findings[0].disallowedFeatureIds).toEqual(['workflows']);
      expect(findings[0].missingFromRefs).toEqual([PNC_A]);
    });

    it('reports safe for a connector shipping with no user-facing features', () => {
      const { status, findings } = classifyConnectorRelease([applicable('.new', [])], resolved());

      expect(status).toBe('safe');
      expect(findings).toEqual([]);
    });

    it('reports safe for a connector shipping only agentBuilder', () => {
      const { status, findings } = classifyConnectorRelease(
        [applicable('.new', ['agentBuilder'])],
        resolved()
      );

      expect(status).toBe('safe');
      expect(findings).toEqual([]);
    });

    it('reports only the disallowed subset when agentBuilder is mixed with a disallowed feature', () => {
      const { findings } = classifyConnectorRelease(
        [applicable('.new', ['agentBuilder', 'workflows'])],
        resolved()
      );

      expect(findings).toHaveLength(1);
      expect(findings[0].disallowedFeatureIds).toEqual(['workflows']);
    });

    it('reports safe for any features once the connector is registered in the release', () => {
      const { status, findings } = classifyConnectorRelease(
        [applicable('.x', ['workflows', 'cases'], [])],
        resolved()
      );

      expect(status).toBe('safe');
      expect(findings).toEqual([]);
    });

    it('reports safe when this PR changes no connector exposure', () => {
      const { status, findings } = classifyConnectorRelease([], resolved());

      expect(status).toBe('safe');
      expect(findings).toEqual([]);
    });
  });

  describe('multiple distinct PNC versions (rollout or rollback in flight)', () => {
    it('reports unsafe when the connector is missing from only one slice', () => {
      const { status, findings } = classifyConnectorRelease(
        [applicable('.new', ['workflows'], [PNC_B])],
        resolved([PNC_A, PNC_B])
      );

      expect(status).toBe('unsafe');
      expect(findings[0].missingFromRefs).toEqual([PNC_B]);
      expect(findings[0].message).toContain(PNC_B.slice(0, 12));
    });

    it('reports safe only when the connector is registered in every slice', () => {
      const { status } = classifyConnectorRelease(
        [applicable('.x', ['workflows'], [])],
        resolved([PNC_A, PNC_B])
      );

      expect(status).toBe('safe');
    });

    it('reports unsafe after a rollback removes the connector from a slice', () => {
      // The slice pointer moved back to a version predating the connector.
      const { status, findings } = classifyConnectorRelease(
        [applicable('.rolled-back', ['workflows'], [PNC_A, PNC_B])],
        resolved([PNC_A, PNC_B])
      );

      expect(status).toBe('unsafe');
      expect(findings[0].missingFromRefs).toEqual([PNC_A, PNC_B]);
    });
  });

  describe('inconclusive outcomes (never safe on missing data)', () => {
    it('is inconclusive when no PNC versions were resolved', () => {
      const result = classifyConnectorRelease([applicable('.new', ['workflows'])], { refs: [] });

      expect(result.status).toBe('inconclusive');
      expect(result.findings).toEqual([]);
      expect(result.reason).toBeDefined();
    });

    it('is inconclusive when the release data is missing entirely', () => {
      const result = classifyConnectorRelease([applicable('.new', ['workflows'])], {});

      expect(result.status).toBe('inconclusive');
      expect(result.reason).toBeDefined();
    });

    it('is inconclusive with the resolver reason when GitOps data is unavailable', () => {
      const result = classifyConnectorRelease([applicable('.new', ['workflows'])], {
        refs: [],
        inconclusiveReason: 'Could not read serverless-gitops/services/kibana/versions.yaml: 404',
      });

      expect(result.status).toBe('inconclusive');
      expect(result.reason).toContain('versions.yaml');
    });

    it('is inconclusive even when refs resolved but the resolver flagged a failure', () => {
      const result = classifyConnectorRelease([applicable('.new', ['workflows'])], {
        refs: [PNC_A],
        inconclusiveReason: 'Could not read all_specs.ts at aaaa.',
      });

      expect(result.status).toBe('inconclusive');
      expect(result.findings).toEqual([]);
    });
  });

  it('honours a custom initial-feature allowlist', () => {
    const { status } = classifyConnectorRelease([applicable('.new', ['workflows'])], resolved(), {
      allowedInitialFeatures: ['workflows'],
    });

    expect(status).toBe('safe');
  });

  it('echoes the inspected refs so the advisory can name them', () => {
    const { refs } = classifyConnectorRelease([], resolved([PNC_A, PNC_B]));

    expect(refs).toEqual([PNC_A, PNC_B]);
  });
});
