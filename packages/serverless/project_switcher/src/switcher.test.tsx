/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, RenderResult, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProjectType } from '@kbn/serverless-types';

import { ProjectSwitcherKibanaProvider, ProjectSwitcherProvider } from './services';
import {
  getProjectSwitcherKibanaDependenciesMock,
  getProjectSwitcherServicesMock,
} from '../mocks/jest.mock';
import { ProjectSwitcher } from './switcher';
import {
  ProjectSwitcher as ProjectSwitcherComponent,
  TEST_ID_BUTTON,
  TEST_ID_ITEM_GROUP,
} from './switcher.component';
import { KibanaDependencies, Services } from './types';

const renderKibanaProjectSwitcher = (
  currentProjectType: ProjectType = 'observability'
): [RenderResult, jest.Mocked<KibanaDependencies>] => {
  const mock = getProjectSwitcherKibanaDependenciesMock();
  return [
    render(
      <ProjectSwitcherKibanaProvider {...mock}>
        <ProjectSwitcher {...{ currentProjectType }} />
      </ProjectSwitcherKibanaProvider>
    ),
    mock,
  ];
};

const renderProjectSwitcher = (
  currentProjectType: ProjectType = 'observability'
): [RenderResult, jest.Mocked<Services>] => {
  const mock = getProjectSwitcherServicesMock();
  return [
    render(
      <ProjectSwitcherProvider {...mock}>
        <ProjectSwitcher {...{ currentProjectType }} />
      </ProjectSwitcherProvider>
    ),
    mock,
  ];
};

describe('ProjectSwitcher', () => {
  describe('Component', () => {
    test('is rendered', () => {
      expect(() =>
        render(
          <ProjectSwitcherComponent
            currentProjectType="observability"
            onProjectChange={jest.fn()}
          />
        )
      ).not.toThrowError();
    });
  });

  describe('Connected Component', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    test("doesn't render if the Provider is missing", () => {
      expect(() => render(<ProjectSwitcher currentProjectType="observability" />)).toThrowError();
    });

    describe('with Services', () => {
      test('is rendered', () => {
        renderProjectSwitcher();
        const button = screen.queryByTestId(TEST_ID_BUTTON);
        expect(button).not.toBeNull();
      });

      test('opens', async () => {
        renderProjectSwitcher();

        let group = screen.queryByTestId(TEST_ID_ITEM_GROUP);
        expect(group).toBeNull();

        const button = screen.getByTestId(TEST_ID_BUTTON);
        await waitFor(() => userEvent.click(button));

        group = screen.queryByTestId(TEST_ID_ITEM_GROUP);
        expect(group).not.toBeNull();
      });

      test('calls setProjectType when clicked', async () => {
        const [_, mock] = renderProjectSwitcher();

        const button = screen.getByTestId(TEST_ID_BUTTON);
        await waitFor(() => userEvent.click(button));

        const group = screen.getByTestId(TEST_ID_ITEM_GROUP);
        const project = await within(group).findByLabelText('Security');
        await waitFor(() => userEvent.click(project));

        expect(mock.setProjectType).toHaveBeenCalled();
      });
    });
  });

  describe('with Kibana Dependencies', () => {
    beforeEach(() => {
      cleanup();
    });

    test('is rendered', () => {
      renderKibanaProjectSwitcher();
      const button = screen.queryByTestId(TEST_ID_BUTTON);
      expect(button).not.toBeNull();
    });

    test('opens', async () => {
      renderKibanaProjectSwitcher();

      let group = screen.queryByTestId(TEST_ID_ITEM_GROUP);
      expect(group).toBeNull();

      const button = screen.getByTestId(TEST_ID_BUTTON);
      userEvent.click(button);

      group = screen.queryByTestId(TEST_ID_ITEM_GROUP);
      expect(group).not.toBeNull();
    });

    test('posts message to change project', async () => {
      const [_, mock] = renderKibanaProjectSwitcher();

      const button = screen.getByTestId(TEST_ID_BUTTON);
      await waitFor(() => userEvent.click(button));

      const group = screen.getByTestId(TEST_ID_ITEM_GROUP);
      const project = await within(group).findByLabelText('Security');
      await waitFor(() => userEvent.click(project));

      expect(mock.coreStart.http.post).toHaveBeenCalled();
    });
  });
});
