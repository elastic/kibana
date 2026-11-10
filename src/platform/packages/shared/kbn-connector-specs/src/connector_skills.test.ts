/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getAllConnectorSkills,
  getConnectorSkillRegistryId,
  getConnectorSkillRegistryIds,
} from './connector_skills';

describe('connector skills', () => {
  const allSkills = getAllConnectorSkills();

  it('finds the skills defined by connector specs, each with its connector type', () => {
    const byType = Object.fromEntries(allSkills.map((s) => [s.connectorTypeId, s.skill.id]));
    expect(byType).toMatchObject({ '.github': 'github', '.pagerduty_mcp': 'pagerduty' });
  });

  it('returns the built-in skill ids for a connector type, and none for other types', () => {
    expect(getConnectorSkillRegistryIds('.github')).toEqual(['platform.connectors.github']);
    expect(getConnectorSkillRegistryIds('.slack')).toEqual([]);
    expect(getConnectorSkillRegistryIds('.not-a-connector')).toEqual([]);
  });

  describe.each(allSkills.map(({ connectorTypeId, skill }) => [connectorTypeId, skill] as const))(
    '%s skill',
    (_connectorTypeId, skill) => {
      it('has a valid name, description and content', () => {
        expect(skill.name).toMatch(/^[a-z0-9-_]+$/);
        expect(skill.name.length).toBeLessThanOrEqual(64);
        expect(skill.description.length).toBeGreaterThan(0);
        expect(skill.description.length).toBeLessThanOrEqual(1024);
        expect(skill.content.trim().length).toBeGreaterThan(0);
      });

      it('has valid resources', () => {
        for (const resource of skill.resources ?? []) {
          expect(resource.name).toMatch(/^[a-zA-Z0-9-_]{1,64}$/);
          expect(resource.relativePath).toMatch(/^\.(?:\/[a-zA-Z0-9-_]+)*$/);
          expect(resource.content.trim().length).toBeGreaterThan(0);
        }
      });
    }
  );

  it('has unique skill ids and names', () => {
    const ids = allSkills.map(({ skill }) => getConnectorSkillRegistryId(skill));
    const names = allSkills.map(({ skill }) => skill.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });
});
