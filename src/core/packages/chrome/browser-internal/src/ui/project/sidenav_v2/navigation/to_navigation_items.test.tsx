/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/dom';
import { toNavigationItems } from './to_navigation_items';
import type {
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';

// use require to bypass unnecessary TypeScript checks for JSON imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const navigationTree = require('./mocks/mock_security_tree.json') as NavigationTreeDefinitionUI;

const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
beforeEach(() => {
  consoleWarnSpy.mockClear();
});

describe('toNavigationItems', () => {
  const {
    logoItem,
    navItems: { footerItems, primaryItems },
  } = toNavigationItems(navigationTree, [], []);

  it('should return missing logo from navigation tree', () => {
    expect(logoItem).toMatchInlineSnapshot(`
      Object {
        "href": "/missing-href-😭",
        "iconType": "logoKibana",
        "id": "kibana",
        "label": "Kibana",
      }
    `);
  });

  it('should return primary items from navigation tree', () => {
    expect(primaryItems).toMatchSnapshot();
  });

  it('should return footer items from navigation tree', () => {
    expect(footerItems).toMatchSnapshot();
  });

  it('should warn about issues with navigation tree', async () => {
    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    expect(consoleWarnSpy.mock.calls[0][0]).toMatchInlineSnapshot(`
      "
      === Navigation Warnings ===
      • No \\"home\\" node found in primary nodes. There should be a logo node with solution logo, name and home page href. renderAs: \\"home\\" is expected.
      • Navigation item is missing. Using fallback value: \\"/missing-href-😭\\".
      • Navigation item is missing. Using fallback value: \\"logoKibana\\".
      • Navigation item is missing. Using fallback value: \\"kibana\\".
      • Navigation item is missing. Using fallback value: \\"Kibana\\".
      • Navigation node \\"node-2\\" is missing href and is not a panel opener. This node was likely used as a sub-section. Ignoring this node and flattening its children: securityGroup:rules, alerts, attack_discovery, cloud_security_posture-findings, cases.
      • Navigation item \\"securityGroup:rules\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation item \\"alerts\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation item \\"attack_discovery\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation item \\"cloud_security_posture-findings\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation item \\"cases\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation node \\"node-3\\" is missing href and is not a panel opener. This node was likely used as a sub-section. Ignoring this node and flattening its children: securityGroup:entityAnalytics, securityGroup:explore, securityGroup:investigations, threat_intelligence.
      • Panel opener node \\"securityGroup:entityAnalytics\\" has no children. Ignoring it.
      • Panel opener node \\"securityGroup:explore\\" should contain panel sections, not direct links. Flattening links \\"hosts, network, users\\" into secondary items and creating a placeholder section for these links.
      • Navigation item \\"securityGroup:explore\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Panel opener node \\"securityGroup:investigations\\" should contain panel sections, not direct links. Flattening links \\"timelines, notes, osquery\\" into secondary items and creating a placeholder section for these links.
      • Navigation item \\"securityGroup:investigations\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation item \\"threat_intelligence\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation node \\"node-4\\" is missing href and is not a panel opener. This node was likely used as a sub-section. Ignoring this node and flattening its children: securityGroup:assets.
      • Secondary menu item node \\"fleet\\" has a href \\"/tzo/s/sec/app/fleet\\", but it should not. We're using it as a section title that doesn't have a link.
      • Navigation item \\"node-0\\" is missing a \\"title\\". Using fallback value: \\"Missing Title 😭\\".
      • Navigation item \\"node-0\\" is missing a \\"href\\". Using fallback value: \\"Missing Href 😭\\".
      • Navigation item \\"securityGroup:assets\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation item \\"securityGroup:machineLearning\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Navigation item \\"stack_management\\" is missing all of \\"iconV2, icon\\". Using fallback value: \\"broom\\".
      • Accordion items are not supported in the new navigation. Flattening them \\"stack_management, monitoring, integrations\\" and dropping accordion node \\"node-2\\"."
    `);
  });
});

describe('isActive', () => {
  it('should return null if no active paths', () => {
    const { activeItemId } = toNavigationItems(navigationTree, [], []);
    expect(activeItemId).toBeUndefined();
  });

  it('should return primary menu node as active item', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode = logoNode.children![0]! as ChromeProjectNavigationNode;

    const { activeItemId } = toNavigationItems(navigationTree, [], [[logoNode, primaryNode]]);
    expect(activeItemId).toBe(primaryNode.id);
  });

  it('should return 1st primary menu node as active item if multiple matching', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode1 = logoNode.children![0]! as ChromeProjectNavigationNode;
    const primaryNode2 = logoNode.children![1]! as ChromeProjectNavigationNode;

    const { activeItemId } = toNavigationItems(
      navigationTree,
      [],
      [
        [logoNode, primaryNode1],
        [logoNode, primaryNode2],
      ]
    );
    expect(activeItemId).toBe(primaryNode1.id);
  });

  it('should return secondary node as active item', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode = logoNode.children![2]! as ChromeProjectNavigationNode;
    const secondaryNode = primaryNode.children![1]! as ChromeProjectNavigationNode;

    const { activeItemId } = toNavigationItems(
      navigationTree,
      [],
      [[logoNode, primaryNode, secondaryNode]]
    );
    expect(activeItemId).toBe(secondaryNode.id);
  });

  it('should return secondary node as active item if active path is beyond navigation', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode = logoNode.children![2]! as ChromeProjectNavigationNode;
    const secondaryNode = primaryNode.children![0]! as ChromeProjectNavigationNode;
    const beyondNavNode = secondaryNode.children![0]! as ChromeProjectNavigationNode;

    const { activeItemId } = toNavigationItems(
      navigationTree,
      [],
      [[logoNode, primaryNode, secondaryNode, beyondNavNode]]
    );
    expect(activeItemId).toBe(secondaryNode.id);
  });

  it('out of two matching paths should pick the deepest', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode = logoNode.children![2]! as ChromeProjectNavigationNode;
    const secondaryNode = primaryNode.children![0]! as ChromeProjectNavigationNode;
    const beyondNavNode = secondaryNode.children![0]! as ChromeProjectNavigationNode;

    const { activeItemId } = toNavigationItems(
      navigationTree,
      [],
      [
        [logoNode, primaryNode, secondaryNode, beyondNavNode],
        [logoNode, primaryNode],
      ]
    );
    expect(activeItemId).toBe(secondaryNode.id);
  });

  it('should support footer items as active', () => {
    const footerRootNode = navigationTree.footer![0]! as ChromeProjectNavigationNode;
    const managementAccordion = footerRootNode.children![2]! as ChromeProjectNavigationNode;
    const managementPrimary = managementAccordion.children![0]! as ChromeProjectNavigationNode;
    const managementSecondarySection =
      managementPrimary.children![0]! as ChromeProjectNavigationNode;
    const managementSecondaryItem =
      managementSecondarySection.children![0]! as ChromeProjectNavigationNode;

    const { activeItemId } = toNavigationItems(
      navigationTree,
      [],
      [
        [
          footerRootNode,
          managementAccordion,
          managementPrimary,
          managementSecondarySection,
          managementSecondaryItem,
        ],
      ]
    );

    expect(activeItemId).toBe(managementSecondaryItem.id);
  });
});

describe('logo node', () => {
  const treeWithLogo = structuredClone(navigationTree);
  const homeNode: ChromeProjectNavigationNode = {
    id: 'securityHome',
    icon: 'launch',
    href: '/tzo/s/sec/app/security/get_started',
    path: 'security_solution_nav.get_started',
    title: 'Security',
    deepLink: {} as any,
    isExternalLink: false,
    sideNavStatus: 'visible',
    renderAs: 'home',
  };

  (treeWithLogo.body[0] as ChromeProjectNavigationNode).children = [
    homeNode,
    ...(treeWithLogo.body[0] as ChromeProjectNavigationNode).children!,
  ];

  test('should return logo node with correct properties', () => {
    const { logoItem } = toNavigationItems(treeWithLogo, [], []);
    expect(logoItem).toMatchInlineSnapshot(`
      Object {
        "href": "/tzo/s/sec/app/security/get_started",
        "iconType": "launch",
        "id": "securityHome",
        "label": "Security",
      }
    `);
  });

  test('Logo node can be active', () => {
    const { activeItemId } = toNavigationItems(treeWithLogo, [], [[homeNode]]);
    expect(activeItemId).toBe(homeNode.id);
  });
});
