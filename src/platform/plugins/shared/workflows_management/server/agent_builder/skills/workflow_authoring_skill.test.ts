/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workflowAuthoringSkill } from './workflow_authoring_skill';
import { workflowTools } from '../../../common/agent_builder/constants';

describe('workflowAuthoringSkill', () => {
  describe('getRegistryTools', () => {
    it('includes all workflow tools', () => {
      const tools = workflowAuthoringSkill.getRegistryTools!();
      expect(tools).toEqual(Object.values(workflowTools));
    });

    it('includes key workflow tools', () => {
      const tools = workflowAuthoringSkill.getRegistryTools!();
      expect(tools).toContain(workflowTools.getStepDefinitions);
      expect(tools).toContain(workflowTools.getTriggerDefinitions);
      expect(tools).toContain(workflowTools.validateWorkflow);
      expect(tools).toContain(workflowTools.getExamples);
      expect(tools).toContain(workflowTools.getConnectors);
      expect(tools).toContain(workflowTools.replaceYaml);
      expect(tools).toContain(workflowTools.insertStep);
      expect(tools).toContain(workflowTools.modifyStep);
      expect(tools).toContain(workflowTools.modifyStepProperty);
      expect(tools).toContain(workflowTools.modifyProperty);
      expect(tools).toContain(workflowTools.deleteStep);
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
  });
});
