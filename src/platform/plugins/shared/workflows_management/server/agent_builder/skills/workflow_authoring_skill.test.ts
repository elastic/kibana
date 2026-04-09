/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { workflowAuthoringSkill } from './workflow_authoring_skill';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  workflowTools,
} from '../../../common/agent_builder/constants';

describe('workflowAuthoringSkill', () => {
  it('passes agent-builder validation', async () => {
    await expect(validateSkillDefinition(workflowAuthoringSkill)).resolves.toBeDefined();
  });

  it('is marked as experimental', () => {
    expect(workflowAuthoringSkill.experimental).toBe(true);
  });

  describe('getRegistryTools', () => {
    it('includes all workflow tools', () => {
      const tools = workflowAuthoringSkill.getRegistryTools!();
      expect(tools).toEqual(Object.values(workflowTools));
    });
  });

  describe('content', () => {
    it('mentions SML tools for workflow discovery', () => {
      expect(workflowAuthoringSkill.content).toContain('platform.core.sml_search');
      expect(workflowAuthoringSkill.content).toContain('platform.core.sml_attach');
    });

    it('does not reference list_workflows or get_workflow tools', () => {
      expect(workflowAuthoringSkill.content).not.toContain('list_workflows');
      expect(workflowAuthoringSkill.content).not.toContain('get_workflow');
    });

    it('references the workflow attachment type', () => {
      expect(workflowAuthoringSkill.content).toContain(WORKFLOW_YAML_ATTACHMENT_TYPE);
    });

    it('documents all edit tools', () => {
      expect(workflowAuthoringSkill.content).toContain(workflowTools.setYaml);
      expect(workflowAuthoringSkill.content).toContain(workflowTools.insertStep);
      expect(workflowAuthoringSkill.content).toContain(workflowTools.modifyStep);
      expect(workflowAuthoringSkill.content).toContain(workflowTools.modifyStepProperty);
      expect(workflowAuthoringSkill.content).toContain(workflowTools.modifyProperty);
      expect(workflowAuthoringSkill.content).toContain(workflowTools.deleteStep);
    });
  });
});
