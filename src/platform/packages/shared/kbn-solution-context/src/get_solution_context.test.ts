/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSolutionContext } from './get_solution_context';
import type { CloudSetup } from './types';

const createCloud = (projectType?: string) =>
  ({
    isServerlessEnabled: !!projectType,
    serverless: { projectType },
  } as CloudSetup);

describe('getSolutionContext', () => {
  describe('non-serverless', () => {
    const cloud = createCloud();

    it('returns classic when no space solution is provided', () => {
      const ctx = getSolutionContext(cloud);
      expect(ctx).toEqual({
        solution: 'classic',
        serverlessProjectType: undefined,
        solutionView: undefined,
        isServerless: false,
      });
    });

    it('normalizes oblt to observability', () => {
      const ctx = getSolutionContext(cloud, 'oblt');
      expect(ctx.solution).toBe('observability');
      expect(ctx.solutionView).toBe('oblt');
    });

    it('normalizes es to search', () => {
      const ctx = getSolutionContext(cloud, 'es');
      expect(ctx.solution).toBe('search');
      expect(ctx.solutionView).toBe('es');
    });

    it('passes through security', () => {
      const ctx = getSolutionContext(cloud, 'security');
      expect(ctx.solution).toBe('security');
      expect(ctx.solutionView).toBe('security');
    });

    it('returns classic for classic space', () => {
      const ctx = getSolutionContext(cloud, 'classic');
      expect(ctx.solution).toBe('classic');
      expect(ctx.solutionView).toBe('classic');
    });

    it('is not serverless', () => {
      const ctx = getSolutionContext(cloud, 'oblt');
      expect(ctx.isServerless).toBe(false);
      expect(ctx.serverlessProjectType).toBeUndefined();
    });
  });

  describe('serverless', () => {
    it('uses projectType as solution', () => {
      const ctx = getSolutionContext(createCloud('observability'));
      expect(ctx.solution).toBe('observability');
      expect(ctx.serverlessProjectType).toBe('observability');
      expect(ctx.isServerless).toBe(true);
    });

    it('returns security for security project', () => {
      expect(getSolutionContext(createCloud('security')).solution).toBe('security');
    });

    it('returns search for search project', () => {
      expect(getSolutionContext(createCloud('search')).solution).toBe('search');
    });

    it('returns workplaceai for workplaceai project', () => {
      expect(getSolutionContext(createCloud('workplaceai')).solution).toBe('workplaceai');
    });

    // in theory this should never happen (security project using oblt solution nav) 
    // but this is how we handle it if it does
    it('serverless projectType takes precedence over space solution', () => {
      const ctx = getSolutionContext(createCloud('security'), 'oblt');
      expect(ctx.solution).toBe('security');
      expect(ctx.solutionView).toBe('oblt');
    });
  });
});
