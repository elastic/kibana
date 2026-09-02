/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSideNavItemType } from '@elastic/eui';
import { renderHook } from '@testing-library/react';
import { WorkflowsPageName } from '@kbn/deeplinks-workflows';
import { setWorkflowsNavLinks } from './test_helpers';
import { useWorkflowsSolutionNav } from './use_workflows_solution_nav';
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

const ALL_PAGES = [WorkflowsPageName.list, WorkflowsPageName.library, WorkflowsPageName.executions];

const renderSolutionNav = ({
  pages = ALL_PAGES,
  initialEntry = '/',
}: { pages?: WorkflowsPageName[]; initialEntry?: string } = {}) => {
  const services = createStartServicesMock();
  setWorkflowsNavLinks(services, pages);

  return renderHook(useWorkflowsSolutionNav, {
    wrapper: getTestProvider({ services, initialEntries: [initialEntry] }),
  });
};

/** The links live in a single unnamed group so they render as regular-weight nested items. */
const getLinks = (
  result: ReturnType<typeof renderSolutionNav>['result']
): Array<EuiSideNavItemType<{}>> => result.current?.items?.[0].items ?? [];

const getLinkIds = (result: ReturnType<typeof renderSolutionNav>['result']) =>
  getLinks(result).map((link) => link.id);

const getSelectedId = (result: ReturnType<typeof renderSolutionNav>['result']) =>
  getLinks(result).find((link) => link.isSelected)?.id;

describe('useWorkflowsSolutionNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when the list page is the only registered deep link', () => {
    const { result } = renderSolutionNav({ pages: [WorkflowsPageName.list] });

    expect(result.current).toBeNull();
  });

  it('should title the navigation after the app', () => {
    const { result } = renderSolutionNav();

    expect(result.current).toEqual(
      expect.objectContaining({ name: 'Workflows', icon: 'workflow' })
    );
  });

  describe('links', () => {
    it('should return a link per registered deep link', () => {
      const { result } = renderSolutionNav();

      expect(getLinkIds(result)).toEqual([
        'workflows:list',
        'workflows:executions',
        'workflows:library',
      ]);
    });

    it('should omit pages whose deep link is not registered', () => {
      const { result } = renderSolutionNav({
        pages: [WorkflowsPageName.list, WorkflowsPageName.executions],
      });

      expect(getLinkIds(result)).toEqual(['workflows:list', 'workflows:executions']);
    });

    it('should take the link titles from the deep links', () => {
      const { result } = renderSolutionNav();

      expect(getLinks(result).map((link) => link.name)).toEqual([
        'Workflows',
        'Executions',
        'Template Library',
      ]);
    });

    it('should strip the app base url so hrefs stay app-relative for the router', () => {
      const { result } = renderSolutionNav();

      expect(getLinks(result).map((link) => link.href)).toEqual(['/', '/executions', '/library']);
    });
  });

  describe('selected link', () => {
    it.each(['/', '/create', '/some-workflow-id'])(
      'should select the list link when the route is %s',
      (initialEntry) => {
        const { result } = renderSolutionNav({ initialEntry });

        expect(getSelectedId(result)).toBe('workflows:list');
      }
    );

    it.each(['/library', '/library/some-slug', '/library/import'])(
      'should select the library link when the route is %s',
      (initialEntry) => {
        const { result } = renderSolutionNav({ initialEntry });

        expect(getSelectedId(result)).toBe('workflows:library');
      }
    );

    it('should select the executions link when the route is /executions', () => {
      const { result } = renderSolutionNav({ initialEntry: '/executions' });

      expect(getSelectedId(result)).toBe('workflows:executions');
    });
  });
});
