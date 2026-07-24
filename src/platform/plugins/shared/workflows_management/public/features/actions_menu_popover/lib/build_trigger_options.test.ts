/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { z } from '@kbn/zod/v4';
import {
  buildBuiltInTriggerOptions,
  buildRegisteredTriggerOptions,
  getTriggerNamespace,
} from './build_trigger_options';
import { getExtensionStability } from '../../../widgets/workflow_yaml_editor/lib/get_stability_note';
import { isActionGroup, isActionOption } from '../types';

const mockEventSchema = z.object({});

function mockTrigger(
  definition: Omit<PublicTriggerDefinition, 'eventSchema'>
): PublicTriggerDefinition {
  return { ...definition, eventSchema: mockEventSchema };
}

jest.mock('../../../widgets/workflow_yaml_editor/lib/get_stability_note', () => ({
  getExtensionStability: jest.fn(() => 'tech_preview'),
}));

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: jest.fn(
      (
        key: string,
        { defaultMessage, values }: { defaultMessage: string; values?: Record<string, string> }
      ) => {
        if (!values) {
          return defaultMessage;
        }
        return Object.entries(values).reduce(
          (message, [placeholder, value]) => message.replace(`{${placeholder}}`, value),
          defaultMessage
        );
      }
    ),
  },
}));

describe('build_trigger_options', () => {
  const mockEuiTheme = {
    colors: {
      vis: {
        euiColorVis6: '#color6',
      },
      textParagraph: '#textColor',
    },
  } as unknown as EuiThemeComputed<{}>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTriggerNamespace', () => {
    it('returns the namespace prefix before the first dot', () => {
      expect(getTriggerNamespace('cases.caseCreated')).toBe('cases');
      expect(getTriggerNamespace('alerting.ruleCreated')).toBe('alerting');
    });

    it('returns undefined when the trigger id has no namespace', () => {
      expect(getTriggerNamespace('manual')).toBeUndefined();
      expect(getTriggerNamespace('.invalid')).toBeUndefined();
    });
  });

  describe('buildBuiltInTriggerOptions', () => {
    it('returns manual, alert, and scheduled triggers', () => {
      const result = buildBuiltInTriggerOptions(mockEuiTheme);

      expect(result.map((option) => option.id)).toEqual(['manual', 'alert', 'scheduled']);
    });
  });

  describe('buildRegisteredTriggerOptions', () => {
    it('groups triggers by namespace', () => {
      const result = buildRegisteredTriggerOptions(
        [
          mockTrigger({
            id: 'cases.caseUpdated',
            title: 'Cases - Case updated',
            description: 'When a case is updated.',
            stability: 'tech_preview',
          }),
          mockTrigger({
            id: 'alerting.ruleCreated',
            title: 'Alerting - Rule created',
            description: 'When a rule is created.',
            stability: 'tech_preview',
          }),
          mockTrigger({
            id: 'alerting.ruleDeleted',
            title: 'Alerting - Rule deleted',
            description: 'When a rule is deleted.',
            stability: 'tech_preview',
          }),
        ],
        mockEuiTheme
      );

      expect(result).toHaveLength(2);
      expect(result.map((option) => option.id)).toEqual(['triggers.alerting', 'cases.caseUpdated']);

      const alertingGroup = result[0];
      const casesOption = result[1];
      expect(alertingGroup).toBeDefined();
      expect(casesOption).toBeDefined();

      if (alertingGroup && isActionGroup(alertingGroup)) {
        expect(alertingGroup.label).toBe('Alerting');
        expect(alertingGroup.options.map((option) => option.id)).toEqual([
          'alerting.ruleCreated',
          'alerting.ruleDeleted',
        ]);
      }

      expect(casesOption?.id).toBe('cases.caseUpdated');
    });

    it('sorts namespaces alphabetically by trigger id prefix', () => {
      const result = buildRegisteredTriggerOptions(
        [
          mockTrigger({
            id: 'workflows.failed',
            title: 'Workflow failed',
            description: 'When a workflow fails.',
            stability: 'stable',
          }),
          mockTrigger({
            id: 'alerting.ruleCreated',
            title: 'Alerting - Rule created',
            description: 'When a rule is created.',
            stability: 'tech_preview',
          }),
          mockTrigger({
            id: 'cases.caseCreated',
            title: 'Cases - Case created',
            description: 'When a case is created.',
            stability: 'tech_preview',
          }),
          mockTrigger({
            id: 'cases.caseUpdated',
            title: 'Cases - Case updated',
            description: 'When a case is updated.',
            stability: 'tech_preview',
          }),
        ],
        mockEuiTheme
      );

      expect(result.map((option) => option.id)).toEqual([
        'alerting.ruleCreated',
        'triggers.cases',
        'workflows.failed',
      ]);
    });

    it('derives namespace group labels from shared trigger title prefixes', () => {
      const result = buildRegisteredTriggerOptions(
        [
          mockTrigger({
            id: 'my-plugin.eventOne',
            title: 'My Plugin - Event one',
            description: 'First event.',
            stability: 'tech_preview',
          }),
          mockTrigger({
            id: 'my-plugin.eventTwo',
            title: 'My Plugin - Event two',
            description: 'Second event.',
            stability: 'tech_preview',
          }),
        ],
        mockEuiTheme
      );

      expect(result).toHaveLength(1);
      const group = result[0];
      expect(group).toBeDefined();
      if (group && isActionGroup(group)) {
        expect(group.label).toBe('My Plugin');
        expect(group.description).toBe('Run workflows when My Plugin events occur');
      }
    });

    it('falls back to a humanized namespace when trigger titles do not share a prefix', () => {
      const result = buildRegisteredTriggerOptions(
        [
          mockTrigger({
            id: 'workflows.failed',
            title: 'Workflow failed',
            description: 'When a workflow fails.',
            stability: 'stable',
          }),
          mockTrigger({
            id: 'workflows.completed',
            title: 'Workflow completed',
            description: 'When a workflow completes.',
            stability: 'stable',
          }),
        ],
        mockEuiTheme
      );

      expect(result).toHaveLength(1);
      const group = result[0];
      expect(group).toBeDefined();
      if (group && isActionGroup(group)) {
        expect(group.label).toBe('Workflows');
      }
    });

    it('does not group a namespace that has only one trigger', () => {
      const result = buildRegisteredTriggerOptions(
        [
          mockTrigger({
            id: 'workflows.failed',
            title: 'Workflow execution failed',
            description: 'When a workflow execution fails.',
            stability: 'tech_preview',
          }),
        ],
        mockEuiTheme
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('workflows.failed');
    });

    it('sets stability on registered trigger options', () => {
      const result = buildRegisteredTriggerOptions(
        [
          mockTrigger({
            id: 'cases.caseUpdated',
            title: 'Case updated',
            description: 'When a case is updated.',
            stability: 'tech_preview',
          }),
        ],
        mockEuiTheme
      );

      const triggerOption = result[0];
      expect(triggerOption).toBeDefined();
      if (triggerOption && isActionOption(triggerOption)) {
        expect(triggerOption.id).toBe('cases.caseUpdated');
        expect(triggerOption.stability).toBe('tech_preview');
        expect(getExtensionStability).toHaveBeenCalled();
      }
    });

    it('returns flat options for triggers without a namespace', () => {
      const result = buildRegisteredTriggerOptions(
        [
          mockTrigger({
            id: 'customTrigger',
            title: 'Custom trigger',
            description: 'Legacy trigger id.',
            stability: 'tech_preview',
          }),
        ],
        mockEuiTheme
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('customTrigger');
    });

    it('places namespace-less triggers after namespaced groups', () => {
      const result = buildRegisteredTriggerOptions(
        [
          mockTrigger({
            id: 'customTrigger',
            title: 'Custom trigger',
            description: 'Legacy trigger id.',
            stability: 'tech_preview',
          }),
          mockTrigger({
            id: 'cases.caseCreated',
            title: 'Cases - Case created',
            description: 'When a case is created.',
            stability: 'tech_preview',
          }),
          mockTrigger({
            id: 'cases.caseUpdated',
            title: 'Cases - Case updated',
            description: 'When a case is updated.',
            stability: 'tech_preview',
          }),
        ],
        mockEuiTheme
      );

      expect(result.map((option) => option.id)).toEqual(['triggers.cases', 'customTrigger']);
    });
  });
});
