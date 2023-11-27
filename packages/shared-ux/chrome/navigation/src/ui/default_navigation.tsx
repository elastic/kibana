/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { NodeDefinition } from '@kbn/core-chrome-browser';

import { Navigation } from './components';
import type {
  GroupDefinition,
  PresetDefinition,
  NavigationTreeDefinition,
  ProjectNavigationDefinition,
  ProjectNavigationTreeDefinition,
  RootNavigationItemDefinition,
  RecentlyAccessedDefinition,
} from './types';
import { RecentlyAccessed } from './components/recently_accessed';
import { NavigationFooter } from './components/navigation_footer';
import { getPresets } from './nav_tree_presets';
import type { ContentProvider } from './components/panel';

const isPresetDefinition = (
  item: RootNavigationItemDefinition | NodeDefinition
): item is PresetDefinition => {
  return (item as PresetDefinition).preset !== undefined;
};

const isGroupDefinition = (
  item: RootNavigationItemDefinition | NodeDefinition
): item is GroupDefinition => {
  return (
    (item as GroupDefinition).type === 'navGroup' || (item as NodeDefinition).children !== undefined
  );
};

const isRecentlyAccessedDefinition = (
  item: RootNavigationItemDefinition | NodeDefinition
): item is RecentlyAccessedDefinition => {
  return (item as RootNavigationItemDefinition).type === 'recentlyAccessed';
};

/**
 * Handler to build a full navigation tree definition from a project definition
 * It adds all the defaults and presets (recently accessed, footer content...)
 *
 * @param projectDefinition The project definition
 * @returns The full navigation tree definition
 */
const getDefaultNavigationTree = (
  projectDefinition: ProjectNavigationTreeDefinition
): NavigationTreeDefinition => {
  return {
    body: [
      {
        type: 'recentlyAccessed',
      },
      ...projectDefinition.map((def) => {
        if ((def as GroupDefinition).children) {
          return { children: [], ...def, type: 'navGroup' as const };
        } else {
          return { ...def, type: 'navItem' as const };
        }
      }),
      {
        type: 'navGroup',
        ...getPresets('analytics'),
      },
      {
        type: 'navGroup',
        ...getPresets('ml'),
      },
    ],
    footer: [
      {
        type: 'navItem',
        id: 'devTools',
        title: i18n.translate('sharedUXPackages.chrome.sideNavigation.devTools', {
          defaultMessage: 'Developer tools',
        }),
        link: 'dev_tools',
        icon: 'editorCodeBlock',
      },
      {
        type: 'navGroup',
        id: 'project_settings_project_nav',
        title: i18n.translate('sharedUXPackages.chrome.sideNavigation.projectSettings', {
          defaultMessage: 'Project settings',
        }),
        icon: 'gear',
        breadcrumbStatus: 'hidden',
        children: [
          {
            link: 'management',
            title: i18n.translate('sharedUXPackages.chrome.sideNavigation.mngt', {
              defaultMessage: 'Management',
            }),
          },
          {
            id: 'cloudLinkUserAndRoles',
            cloudLink: 'userAndRoles',
          },
          {
            id: 'cloudLinkBilling',
            cloudLink: 'billingAndSub',
          },
        ],
      },
    ],
  };
};

interface Props {
  dataTestSubj?: string;
  panelContentProvider?: ContentProvider;
}

const DefaultNavigationComp: FC<ProjectNavigationDefinition & Props> = ({
  projectNavigationTree,
  navigationTree,
  dataTestSubj,
  panelContentProvider,
}) => {
  if (!navigationTree && !projectNavigationTree) {
    throw new Error('One of navigationTree or projectNavigationTree must be defined');
  }

  const renderNodes = useCallback(
    (nodes: Array<RootNavigationItemDefinition | NodeDefinition> = []) => {
      return nodes.map((navNode, i) => {
        if (isPresetDefinition(navNode)) {
          return <Navigation.Group preset={navNode.preset} key={`${navNode.preset}-${i}`} />;
        }

        if (isRecentlyAccessedDefinition(navNode)) {
          return <RecentlyAccessed {...navNode} key={`recentlyAccessed-${i}`} />;
        }

        if (isGroupDefinition(navNode)) {
          // Recursively build the tree
          return (
            <Navigation.Group {...navNode} key={navNode.id ?? i}>
              {renderNodes(navNode.children)}
            </Navigation.Group>
          );
        }

        return <Navigation.Item {...navNode} key={navNode.id ?? i} />;
      });
    },
    []
  );

  const definitionToJSX = useMemo(() => {
    const definition = !navigationTree
      ? getDefaultNavigationTree(projectNavigationTree!)
      : navigationTree;

    const { body, footer } = definition;
    return { body: renderNodes(body), footer: Boolean(footer) ? renderNodes(footer) : null };
  }, [navigationTree, projectNavigationTree, renderNodes]);

  return (
    <Navigation dataTestSubj={dataTestSubj} panelContentProvider={panelContentProvider}>
      {definitionToJSX.body}
      {definitionToJSX.footer && <NavigationFooter>{definitionToJSX.footer}</NavigationFooter>}
    </Navigation>
  );
};

export const DefaultNavigation = React.memo(DefaultNavigationComp) as typeof DefaultNavigationComp;
