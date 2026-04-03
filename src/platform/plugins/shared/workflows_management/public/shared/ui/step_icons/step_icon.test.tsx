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
import { ExecutionStatus } from '@kbn/workflows';
import { StepIcon } from './step_icon';
import { useKibana } from '../../../hooks/use_kibana';

// Activates the __mocks__/use_kibana.ts auto-mock which uses createStartServicesMock()
jest.mock('../../../hooks/use_kibana');

// Capture the services before any test resets mocks
const mockServices = jest.mocked(useKibana)().services;

beforeEach(() => {
  jest.restoreAllMocks();
  // Re-establish the auto-mock return value since restoreAllMocks clears it
  jest
    .mocked(useKibana)
    .mockReturnValue({ services: mockServices } as ReturnType<typeof useKibana>);
});

describe('StepIcon', () => {
  describe('trigger type icons', () => {
    it('renders play icon for trigger_manual', () => {
      const { container } = render(
        <StepIcon stepType="trigger_manual" executionStatus={undefined} />
      );
      expect(container.querySelector('[data-euiicon-type="play"]')).toBeInTheDocument();
    });

    it('renders warning icon for trigger_alert', () => {
      const { container } = render(
        <StepIcon stepType="trigger_alert" executionStatus={undefined} />
      );
      expect(container.querySelector('[data-euiicon-type="warning"]')).toBeInTheDocument();
    });

    it('renders document icon for trigger_document', () => {
      const { container } = render(
        <StepIcon stepType="trigger_document" executionStatus={undefined} />
      );
      expect(container.querySelector('[data-euiicon-type="document"]')).toBeInTheDocument();
    });

    it('renders clock icon for trigger_scheduled', () => {
      const { container } = render(
        <StepIcon stepType="trigger_scheduled" executionStatus={undefined} />
      );
      expect(container.querySelector('[data-euiicon-type="clock"]')).toBeInTheDocument();
    });
  });

  describe('built-in step type icons', () => {
    it('renders globe icon for http step', () => {
      const { container } = render(<StepIcon stepType="http" executionStatus={undefined} />);
      expect(container.querySelector('[data-euiicon-type="globe"]')).toBeInTheDocument();
    });

    it('renders console icon for console step', () => {
      const { container } = render(<StepIcon stepType="console" executionStatus={undefined} />);
      expect(container.querySelector('[data-euiicon-type="commandLine"]')).toBeInTheDocument();
    });

    it('renders branch icon for if step', () => {
      const { container } = render(<StepIcon stepType="if" executionStatus={undefined} />);
      expect(container.querySelector('[data-euiicon-type="branch"]')).toBeInTheDocument();
    });

    it('renders refresh icon for foreach step', () => {
      const { container } = render(<StepIcon stepType="foreach" executionStatus={undefined} />);
      expect(container.querySelector('[data-euiicon-type="refresh"]')).toBeInTheDocument();
    });

    it('renders email icon for email step', () => {
      const { container } = render(<StepIcon stepType="email" executionStatus={undefined} />);
      expect(container.querySelector('[data-euiicon-type="mail"]')).toBeInTheDocument();
    });

    it('renders logoSlack icon for slack step', () => {
      const { container } = render(<StepIcon stepType="slack" executionStatus={undefined} />);
      expect(container.querySelector('[data-euiicon-type="logoSlack"]')).toBeInTheDocument();
    });

    it('renders sparkles icon for inference step', () => {
      const { container } = render(<StepIcon stepType="inference" executionStatus={undefined} />);
      expect(container.querySelector('[data-euiicon-type="sparkles"]')).toBeInTheDocument();
    });

    it('renders logoElasticsearch for elasticsearch-prefixed steps', () => {
      const { container } = render(
        <StepIcon stepType="elasticsearch.index" executionStatus={undefined} />
      );
      expect(
        container.querySelector('[data-euiicon-type="logoElasticsearch"]')
      ).toBeInTheDocument();
    });

    it('renders logoKibana for kibana-prefixed steps', () => {
      const { container } = render(
        <StepIcon stepType="kibana.action" executionStatus={undefined} />
      );
      expect(container.querySelector('[data-euiicon-type="logoKibana"]')).toBeInTheDocument();
    });

    it('renders plugs icon for unknown step types', () => {
      const { container } = render(
        <StepIcon stepType="some_unknown_type" executionStatus={undefined} />
      );
      expect(container.querySelector('[data-euiicon-type="plugs"]')).toBeInTheDocument();
    });
  });

  describe('execution status overrides', () => {
    it('renders a loading spinner when execution status is RUNNING', () => {
      const { container } = render(
        <StepIcon stepType="http" executionStatus={ExecutionStatus.RUNNING} />
      );
      expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });

    it('renders hourglass icon when execution status is WAITING_FOR_INPUT', () => {
      const { container } = render(
        <StepIcon stepType="http" executionStatus={ExecutionStatus.WAITING_FOR_INPUT} />
      );
      expect(container.querySelector('[data-euiicon-type="hourglass"]')).toBeInTheDocument();
    });
  });

  describe('custom step definitions', () => {
    it('does not render fallback plugs icon when a custom step definition has an icon', () => {
      const CustomIcon = () => React.createElement('svg', null);
      (mockServices.workflowsExtensions.getStepDefinition as jest.Mock).mockReturnValue({
        icon: CustomIcon,
      });

      const { container } = render(<StepIcon stepType="custom_step" executionStatus={undefined} />);
      // When a custom icon is provided, the default "plugs" icon should NOT render
      expect(container.querySelector('[data-euiicon-type="plugs"]')).not.toBeInTheDocument();
    });
  });

  describe('__overview pseudo-step', () => {
    it('renders execution status icon for __overview step with COMPLETED status', () => {
      const { container } = render(
        <StepIcon stepType="__overview" executionStatus={ExecutionStatus.COMPLETED} />
      );
      expect(container.querySelector('[data-euiicon-type="checkCircleFill"]')).toBeInTheDocument();
    });

    it('renders a loading spinner for __overview step with RUNNING status', () => {
      const { container } = render(
        <StepIcon stepType="__overview" executionStatus={ExecutionStatus.RUNNING} />
      );
      expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });
  });
});
