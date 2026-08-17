/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import userEvent from '@testing-library/user-event';
import type { CPSProject } from '../../../../types';
import { ProjectPickerList } from './list';
import { ProjectPickerStateProvider, type ProjectPickerStateProviderProps } from '../../state';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  root: Element | null;
  callback: IntersectionObserverCallback;
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = (options?.root as Element) ?? null;
    MockIntersectionObserver.instances.push(this);
  }
}

const setIntersecting = (isIntersecting: boolean) => {
  const observerInstance = MockIntersectionObserver.instances.at(-1);

  if (!observerInstance) {
    throw new Error('No IntersectionObserver instance was created');
  }

  act(() => {
    observerInstance.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      observerInstance as unknown as IntersectionObserver
    );
  });
};

const createProject = (id: string, tags: Record<string, string> = {}): CPSProject => ({
  _id: id,
  _alias: id,
  _type: 'security',
  _organisation: 'org',
  _region: 'us-east-1',
  _csp: 'AWS',
  ...tags,
});

const defaultProps: Pick<ProjectPickerStateProviderProps, 'availableProjects'> = {
  availableProjects: Array.from({ length: 10 }, () => ({
    _id: faker.string.uuid(),
    _type: faker.helpers.arrayElement(['security', 'observability', 'elasticsearch']),
    _alias: faker.company.name(),
    _organisation: faker.company.name(),
    _region: faker.helpers.arrayElement(['us-east-1', 'us-west-1', 'eu-west-1']),
    _provider: faker.helpers.arrayElement(['AWS', 'Azure', 'GCP']),
  })),
};

const renderComponent = (
  props: Partial<Pick<ProjectPickerStateProviderProps, 'availableProjects' | 'isReadOnly'>> = {}
) => {
  return render(
    <ProjectPickerStateProvider {...defaultProps} {...props}>
      <ProjectPickerList />
    </ProjectPickerStateProvider>
  );
};

const ProjectPickerListWithScrollContainer = (
  props: Partial<Pick<ProjectPickerStateProviderProps, 'availableProjects' | 'isReadOnly'>>
) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div data-test-subj="projectPickerListScrollContainer" ref={scrollContainerRef}>
      <ProjectPickerStateProvider {...defaultProps} {...props}>
        <ProjectPickerList scrollContainerRef={scrollContainerRef} />
      </ProjectPickerStateProvider>
    </div>
  );
};

const renderComponentWithScrollContainer = (
  props: Partial<Pick<ProjectPickerStateProviderProps, 'availableProjects' | 'isReadOnly'>> = {}
) => {
  return render(<ProjectPickerListWithScrollContainer {...props} />);
};

describe('ProjectPickerList', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it('should render', () => {
    renderComponent();
    expect(screen.getByTestId('projectPickerList')).toBeInTheDocument();
  });

  it('should render the entire project list', () => {
    renderComponent();
    expect(screen.getAllByTestId('projectPickerListItem')).toHaveLength(
      defaultProps.availableProjects.length
    );
  });

  it('should prevent toggling the last included project', async () => {
    const user = userEvent.setup();
    renderComponent();

    const allProjects = screen.getAllByTestId('projectPickerListItem');

    // Toggle all projects except the last one
    for (const project of allProjects.slice(0, -1)) {
      const projectSwitchElement = await within(project).findByRole('switch');

      expect(projectSwitchElement).toHaveAttribute('aria-checked', 'true');
      await user.click(projectSwitchElement);

      expect(projectSwitchElement).toHaveAttribute('aria-checked', 'false');
    }

    const lastIncludedProject = allProjects[allProjects.length - 1];
    const lastIncludedProjectSwitchElement = await within(lastIncludedProject).findByRole('switch');
    expect(lastIncludedProjectSwitchElement).toHaveAttribute('aria-checked', 'true');

    try {
      await user.click(lastIncludedProjectSwitchElement);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Unable to perform pointer interaction');
    } finally {
      expect(lastIncludedProjectSwitchElement).toHaveAttribute('aria-checked', 'true');
    }
  });

  describe('project popovers', () => {
    const taggedProjects = [
      createProject('project-a', { env: 'prod-a' }),
      createProject('project-b', { env: 'prod-b' }),
    ];

    const renderTaggedList = () => renderComponent({ availableProjects: taggedProjects });

    it('shows project tags in a popover when the tags badge is clicked', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      await user.click(within(projectA).getByTestId('projectPickerListItemTags'));

      await expect(screen.findByLabelText('Project tags')).resolves.toBeInTheDocument();
    });

    it('replaces an open context menu with tags from a different project', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-a'));
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      const projectB = screen.getAllByTestId('projectPickerListItem')[1];
      await user.click(within(projectB).getByTestId('projectPickerListItemTags'));

      expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();
      expect(screen.getByText('env:prod-b')).toBeInTheDocument();
      expect(screen.queryByText('env:prod-a')).not.toBeInTheDocument();
    });

    it('replaces open tags with the context menu from a different project', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      await user.click(within(projectA).getByTestId('projectPickerListItemTags'));
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();
      expect(screen.getByText('env:prod-a')).toBeInTheDocument();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-b'));

      expect(screen.queryByLabelText('Project tags')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();
      expect(screen.queryByText('env:prod-a')).not.toBeInTheDocument();
    });

    it('keeps a single context menu when switching between projects', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-a'));
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-b'));

      expect(screen.getAllByLabelText('Project context menu')).toHaveLength(1);
      expect(screen.queryByLabelText('Project tags')).not.toBeInTheDocument();

      await user.click(screen.getByText('Exclude only this project'));

      expect(screen.getByTestId('projectPickerListItemSwitch-project-a')).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByTestId('projectPickerListItemSwitch-project-b')).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('closes the popover when the same control is clicked twice', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      const contextMenuButton = screen.getByTestId('projectPickerListItemContextMenu-project-a');
      await user.click(contextMenuButton);
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      await user.click(contextMenuButton);
      expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      const tagsBadge = within(projectA).getByTestId('projectPickerListItemTags');
      await user.click(tagsBadge);
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();

      await user.click(tagsBadge);
      expect(screen.queryByLabelText('Project tags')).not.toBeInTheDocument();
    });
  });

  describe('hiding and reopening popovers on scroll', () => {
    const taggedProjects = [
      createProject('project-a', { env: 'prod-a' }),
      createProject('project-b', { env: 'prod-b' }),
    ];

    const renderTaggedListWithScrollContainer = () =>
      renderComponentWithScrollContainer({ availableProjects: taggedProjects });

    it('hides the context menu when its anchor scrolls out of the scroll container view', async () => {
      const user = userEvent.setup();
      renderTaggedListWithScrollContainer();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-a'));
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      setIntersecting(false);

      await waitFor(() => {
        expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();
      });
    });

    it('hides the tags popover when its anchor scrolls out of the scroll container view', async () => {
      const user = userEvent.setup();
      renderTaggedListWithScrollContainer();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      await user.click(within(projectA).getByTestId('projectPickerListItemTags'));
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();

      setIntersecting(false);

      await waitFor(() => {
        expect(screen.queryByLabelText('Project tags')).not.toBeInTheDocument();
      });
    });

    it('keeps the popover open while its anchor remains visible in the scroll container', async () => {
      const user = userEvent.setup();
      renderTaggedListWithScrollContainer();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      await user.click(within(projectA).getByTestId('projectPickerListItemTags'));

      setIntersecting(true);

      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();
    });

    it('reopens the tags popover once its anchor scrolls back into view', async () => {
      const user = userEvent.setup();
      renderTaggedListWithScrollContainer();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      await user.click(within(projectA).getByTestId('projectPickerListItemTags'));
      expect(screen.getByText('env:prod-a')).toBeInTheDocument();

      setIntersecting(false);
      await waitFor(() => {
        expect(screen.queryByLabelText('Project tags')).not.toBeInTheDocument();
      });

      setIntersecting(true);
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();
      expect(screen.getByText('env:prod-a')).toBeInTheDocument();
    });

    it('does not reopen a popover once a different one has been opened', async () => {
      const user = userEvent.setup();
      renderTaggedListWithScrollContainer();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-a'));
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      const staleObserver = MockIntersectionObserver.instances.at(-1);
      setIntersecting(false);
      await waitFor(() => {
        expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();
      });

      const projectB = screen.getAllByTestId('projectPickerListItem')[1];
      await user.click(within(projectB).getByTestId('projectPickerListItemTags'));
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();
      expect(staleObserver?.disconnect).toHaveBeenCalled();

      act(() => {
        staleObserver?.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          staleObserver as unknown as IntersectionObserver
        );
      });

      expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();
    });

    it('does not throw when a stale observer fires after the popover has been explicitly closed', async () => {
      const user = userEvent.setup();
      renderTaggedListWithScrollContainer();

      const contextMenuButton = screen.getByTestId('projectPickerListItemContextMenu-project-a');
      await user.click(contextMenuButton);
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      const staleObserver = MockIntersectionObserver.instances.at(-1);

      await user.click(contextMenuButton);
      expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();

      expect(() => {
        act(() => {
          staleObserver?.callback(
            [{ isIntersecting: false } as IntersectionObserverEntry],
            staleObserver as unknown as IntersectionObserver
          );
        });
      }).not.toThrow();

      expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();
    });

    it('observes the anchor button against the provided scroll container', async () => {
      const user = userEvent.setup();
      renderTaggedListWithScrollContainer();

      const contextMenuButton = screen.getByTestId('projectPickerListItemContextMenu-project-a');
      await user.click(contextMenuButton);

      const observerInstance = MockIntersectionObserver.instances.at(-1);
      expect(observerInstance?.root).toBe(screen.getByTestId('projectPickerListScrollContainer'));
      expect(observerInstance?.observe).toHaveBeenCalledWith(contextMenuButton);
    });

    it('does not throw when no scroll container ref is provided', async () => {
      const user = userEvent.setup();
      renderComponent({ availableProjects: taggedProjects });

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-a'));
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();
      expect(MockIntersectionObserver.instances).toHaveLength(0);

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-a'));
      expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();
    });
  });

  describe('read-only mode', () => {
    const taggedProjects = [
      createProject('project-a', { env: 'prod-a' }),
      createProject('project-b', { env: 'prod-b' }),
    ];

    const renderReadOnlyList = () =>
      renderComponent({ availableProjects: taggedProjects, isReadOnly: true });

    it('does not render inclusion switches or per-project context menus', () => {
      renderReadOnlyList();

      expect(screen.queryByTestId('projectPickerListItemSwitch-project-a')).toBeDisabled();
      expect(screen.queryByTestId('projectPickerListItemSwitch-project-b')).toBeDisabled();
      expect(screen.queryByTestId('projectPickerListItemContextMenu-project-a')).toBeDisabled();
      expect(screen.queryByTestId('projectPickerListItemContextMenu-project-b')).toBeDisabled();
    });

    it('still opens the tags popover when the tags badge is clicked', async () => {
      const user = userEvent.setup();
      renderReadOnlyList();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      await user.click(within(projectA).getByTestId('projectPickerListItemTags'));

      await expect(screen.findByLabelText('Project tags')).resolves.toBeInTheDocument();
    });
  });
});
