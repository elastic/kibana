/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type {
  PublicStepDefinition,
  PublicTriggerDefinition,
} from '@kbn/workflows-extensions/public';
import { HardcodedIcons } from './hardcoded_icons';
import { TypeIcon } from './type_icon';
import { createMockWorkflowsUiServices } from '../../context/__mocks__/mocks';
import { useWorkflowsUiServices } from '../../context/workflows_ui_services';

jest.mock('@kbn/connector-specs/icons', () => ({
  ConnectorIconsMap: new Map([['.abuseipdb', 'plugs']]),
}));
jest.mock('../../context/workflows_ui_services');

const mockUseWorkflowsUiServices = jest.mocked(useWorkflowsUiServices);

beforeEach(() => {
  mockUseWorkflowsUiServices.mockReturnValue(createMockWorkflowsUiServices());
});

const iconType = (container: HTMLElement) =>
  container.querySelector('[data-euiicon-type]')?.getAttribute('data-euiicon-type');

const dataUrlIcon = (container: HTMLElement) =>
  container.querySelector('[data-test-subj="workflowTypeIconDataUrl"]');

describe('TypeIcon', () => {
  describe('kind="trigger"', () => {
    it.each([
      ['manual', HardcodedIcons.manual],
      ['alert', HardcodedIcons.alert],
      ['scheduled', HardcodedIcons.scheduled],
    ])('renders the built-in icon for "%s"', (triggerType, expectedIcon) => {
      const { container } = render(<TypeIcon type={triggerType} kind="trigger" />);
      expect(iconType(container) ?? dataUrlIcon(container)?.getAttribute('data-test-subj')).toBe(
        expectedIcon.startsWith('data:') ? 'workflowTypeIconDataUrl' : expectedIcon
      );
    });

    it('resolves a custom trigger icon from the workflows extensions registry', () => {
      const services = createMockWorkflowsUiServices();
      jest
        .mocked(services.workflowsExtensions.getTriggerDefinition)
        .mockReturnValue({ icon: 'cloudSunny' } as unknown as PublicTriggerDefinition);
      mockUseWorkflowsUiServices.mockReturnValue(services);

      const { container } = render(<TypeIcon type="custom-trigger" kind="trigger" />);
      expect(iconType(container)).toBe('cloudSunny');
    });

    it('falls back to "bolt" for an unknown trigger with no registered definition', () => {
      const { container } = render(<TypeIcon type="custom-trigger" kind="trigger" />);
      expect(iconType(container) ?? dataUrlIcon(container)?.getAttribute('data-test-subj')).toBe(
        HardcodedIcons.trigger.startsWith('data:')
          ? 'workflowTypeIconDataUrl'
          : HardcodedIcons.trigger
      );
    });
  });

  describe('kind="step"', () => {
    it('prefers a workflows extensions step definition icon', () => {
      const services = createMockWorkflowsUiServices();
      jest.mocked(services.workflowsExtensions.getStepDefinition).mockReturnValue({
        id: 'cases.createCase',
        icon: 'casesApp',
      } as unknown as PublicStepDefinition);
      mockUseWorkflowsUiServices.mockReturnValue(services);

      const { container } = render(<TypeIcon type="cases.createCase" kind="step" />);
      expect(iconType(container)).toBe('casesApp');
    });

    it('resolves a connector spec icon when no extension icon exists', () => {
      const { container } = render(<TypeIcon type="abuseipdb.checkIp" kind="step" />);
      expect(iconType(container)).toBe('plugs');
    });

    it('resolves a connector icon from the action-type registry (e.g. webhook)', () => {
      const services = createMockWorkflowsUiServices();
      services.triggersActionsUi.actionTypeRegistry.register({
        id: '.webhook',
        iconClass: 'logoWebhook',
      } as unknown as ActionTypeModel);
      mockUseWorkflowsUiServices.mockReturnValue(services);

      const { container } = render(<TypeIcon type="webhook.run" kind="step" />);
      expect(iconType(container)).toBe('logoWebhook');
    });

    it('falls back to the static base-type icon map', () => {
      const { container } = render(<TypeIcon type="http" kind="step" />);
      expect(iconType(container)).toBe('globe');
    });

    it('falls back to "plugs" for an unrecognized step type', () => {
      const { container } = render(<TypeIcon type="unknown_connector.doThing" kind="step" />);
      expect(iconType(container)).toBe('plugs');
    });
  });
});
