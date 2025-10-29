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
import { PanelStateManager } from './panel_state_manager';
import type {
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';

// use require to bypass unnecessary TypeScript checks for JSON imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const navigationTree = require('./mocks/mock_security_tree.json') as NavigationTreeDefinitionUI;

const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

// Mock panelStateManager for testing
const mockPanelStateManager = new PanelStateManager();

// Utility function to simplify toNavigationItems calls in tests
const createNavigationItems = (
  tree: NavigationTreeDefinitionUI = navigationTree,
  activeNodes: ChromeProjectNavigationNode[][] = []
) => {
  return toNavigationItems(tree, activeNodes, mockPanelStateManager);
};

beforeEach(() => {
  consoleWarnSpy.mockClear();
  mockPanelStateManager.clear();
});

describe('toNavigationItems', () => {
  const {
    logoItem,
    navItems: { footerItems, primaryItems },
  } = createNavigationItems();

  it('should return missing logo from navigation tree', () => {
    expect(logoItem).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": undefined,
        "href": "/missing-href-😭",
        "iconType": "broom",
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
      • No icon found for node \\"undefined\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • Navigation item is missing. Using fallback value: \\"kibana\\".
      • Navigation item is missing. Using fallback value: \\"Kibana\\".
      • Navigation node \\"node-2\\" is missing href and is not a panel opener. This node was likely used as a sub-section. Ignoring this node and flattening its children: securityGroup:rules, alerts, attack_discovery, cloud_security_posture-findings, cases.
      • No icon found for node \\"securityGroup:rules\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • No icon found for node \\"alerts\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • No icon found for node \\"attack_discovery\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • No icon found for node \\"cloud_security_posture-findings\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • No icon found for node \\"cases\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • Navigation node \\"node-3\\" is missing href and is not a panel opener. This node was likely used as a sub-section. Ignoring this node and flattening its children: securityGroup:entityAnalytics, securityGroup:explore, securityGroup:investigations, threat_intelligence.
      • Panel opener node \\"securityGroup:entityAnalytics\\" has no children. Ignoring it.
      • Panel opener node \\"securityGroup:explore\\" should contain panel sections, not direct links. Flattening links \\"hosts, network, users\\" into secondary items and creating a placeholder section for these links.
      • No icon found for node \\"securityGroup:explore\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • Panel opener node \\"securityGroup:investigations\\" should contain panel sections, not direct links. Flattening links \\"timelines, notes, osquery\\" into secondary items and creating a placeholder section for these links.
      • No icon found for node \\"securityGroup:investigations\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • No icon found for node \\"threat_intelligence\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • Navigation node \\"node-4\\" is missing href and is not a panel opener. This node was likely used as a sub-section. Ignoring this node and flattening its children: securityGroup:assets.
      • Secondary menu item node \\"fleet\\" has a href \\"/tzo/s/sec/app/fleet\\", but it should not. We're using it as a section title that doesn't have a link.
      • Navigation item \\"node-0\\" is missing a \\"title\\". Using fallback value: \\"Missing Title 😭\\".
      • Navigation item \\"node-0\\" is missing a \\"href\\". Using fallback value: \\"Missing Href 😭\\".
      • No icon found for node \\"securityGroup:assets\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • No icon found for node \\"securityGroup:machineLearning\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • No icon found for node \\"stack_management\\". Expected iconV2, icon, deepLink.euiIconType, deepLink.icon or a known deep link id. Using fallback icon \\"broom\\".
      • Accordion items are not supported in the new navigation. Flattening them \\"stack_management, monitoring, integrations\\" and dropping accordion node \\"node-2\\".
      • ID \\"endpoints\\" is used 2 times in navigation items. Each navigation item must have a unique ID."
    `);
  });
});

describe('isActive', () => {
  it('should return null if no active paths', () => {
    const { activeItemId } = createNavigationItems();
    expect(activeItemId).toBeUndefined();
  });

  it('should return primary menu node as active item', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode = logoNode.children![0]! as ChromeProjectNavigationNode;

    const { activeItemId } = createNavigationItems(navigationTree, [[logoNode, primaryNode]]);
    expect(activeItemId).toBe(primaryNode.id);
  });

  it('should return 1st primary menu node as active item if multiple matching', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode1 = logoNode.children![0]! as ChromeProjectNavigationNode;
    const primaryNode2 = logoNode.children![1]! as ChromeProjectNavigationNode;

    const { activeItemId } = createNavigationItems(navigationTree, [
      [logoNode, primaryNode1],
      [logoNode, primaryNode2],
    ]);
    expect(activeItemId).toBe(primaryNode1.id);
  });

  it('should return secondary node as active item', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode = logoNode.children![2]! as ChromeProjectNavigationNode;
    const secondaryNode = primaryNode.children![1]! as ChromeProjectNavigationNode;

    const { activeItemId } = createNavigationItems(navigationTree, [
      [logoNode, primaryNode, secondaryNode],
    ]);
    expect(activeItemId).toBe(secondaryNode.id);
  });

  it('should return secondary node as active item if active path is beyond navigation', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode = logoNode.children![2]! as ChromeProjectNavigationNode;
    const secondaryNode = primaryNode.children![0]! as ChromeProjectNavigationNode;
    const beyondNavNode = secondaryNode.children![0]! as ChromeProjectNavigationNode;

    const { activeItemId } = createNavigationItems(navigationTree, [
      [logoNode, primaryNode, secondaryNode, beyondNavNode],
    ]);
    expect(activeItemId).toBe(secondaryNode.id);
  });

  it('out of two matching paths should pick the deepest', () => {
    const logoNode = navigationTree.body[0] as ChromeProjectNavigationNode;
    const primaryNode = logoNode.children![2]! as ChromeProjectNavigationNode;
    const secondaryNode = primaryNode.children![0]! as ChromeProjectNavigationNode;
    const beyondNavNode = secondaryNode.children![0]! as ChromeProjectNavigationNode;

    const { activeItemId } = createNavigationItems(navigationTree, [
      [logoNode, primaryNode, secondaryNode, beyondNavNode],
      [logoNode, primaryNode],
    ]);
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

    const { activeItemId } = createNavigationItems(navigationTree, [
      [
        footerRootNode,
        managementAccordion,
        managementPrimary,
        managementSecondarySection,
        managementSecondaryItem,
      ],
    ]);

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
    const { logoItem } = createNavigationItems(treeWithLogo);
    expect(logoItem).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": "nav-item nav-item-security_solution_nav.get_started nav-item-deepLinkId-undefined nav-item-id-securityHome nav-item-home",
        "href": "/tzo/s/sec/app/security/get_started",
        "iconType": "launch",
        "id": "securityHome",
        "label": "Security",
      }
    `);
  });

  test('Logo node can be active', () => {
    const { activeItemId } = createNavigationItems(treeWithLogo, [[homeNode]]);
    expect(activeItemId).toBe(homeNode.id);
  });
});

describe('panel opener href', () => {
  it('should return panel opener href as first child href', () => {
    const {
      navItems: { primaryItems },
    } = createNavigationItems();

    // Find a panel opener from the existing mock tree - 'securityGroup:rules' is a panel opener
    const rulesPanel = primaryItems.find((item) => item.id === 'securityGroup:rules');
    expect(rulesPanel).toBeDefined();
    expect(rulesPanel?.href).toBe('/tzo/s/sec/app/security/rules');
  });

  it('should ignore external urls', () => {
    const tree = structuredClone(navigationTree);
    // @ts-expect-error to avoid excess type checking for test
    tree.body[0]!.children![2].children[0].children[0].children[0].isExternalLink = true; // 'securityGroup:rules' first child is now external

    const {
      navItems: { primaryItems },
    } = createNavigationItems(tree);

    // Find a panel opener from the existing mock tree - 'securityGroup:rules' is a panel opener
    const rulesPanel = primaryItems.find((item) => item.id === 'securityGroup:rules');
    expect(rulesPanel).toBeDefined();
    expect(rulesPanel?.href).toBe('/tzo/s/sec/app/security/cloud_security_posture/benchmarks');
  });

  it('should return panel opener href as last active child href', () => {
    // Set up a last active item for the securityGroup:rules panel
    mockPanelStateManager.setPanelLastActive(
      'securityGroup:rules',
      'cloud_security_posture-benchmarks'
    );

    const {
      navItems: { primaryItems },
    } = createNavigationItems();

    // Find the panel opener and verify it uses the last active item's href
    const rulesPanel = primaryItems.find((item) => item.id === 'securityGroup:rules');
    expect(rulesPanel).toBeDefined();
    expect(rulesPanel?.href).toBe('/tzo/s/sec/app/security/cloud_security_posture/benchmarks');
  });
});

describe('empty panel opener', () => {
  it('should not return panel opener if it has no children', () => {
    const tree = structuredClone(navigationTree);
    // @ts-expect-error to avoid excess type checking for test
    tree.body[0]!.children![2].children = []; // 'securityGroup:rules' panel opener has no children now
    const {
      navItems: { primaryItems },
    } = createNavigationItems(tree);

    expect(primaryItems.find((item) => item.id === 'securityGroup:rules')).toBeUndefined();
  });
});

describe('hidden panel link', () => {
  // https://github.com/elastic/kibana/issues/240275
  it('should remove panel links marked as hidden, but should keep opener active', () => {
    const tree = structuredClone(navigationTree);
    // @ts-expect-error to avoid excess type checking for test
    const stackManagementNode = tree.footer[0].children[2].children[0];
    stackManagementNode.children.push({
      link: 'management',
      sideNavStatus: 'hidden',
    });

    // Add management link under stack management section
    const {
      navItems: { footerItems },
      activeItemId,
    } = createNavigationItems(tree, [
      [
        // @ts-expect-error to avoid excess type checking for test
        tree.footer[0],
        // @ts-expect-error to avoid excess type checking for test
        tree.footer[0].children[2],
        stackManagementNode,
        stackManagementNode.children[stackManagementNode.children.length - 1],
      ],
    ]);

    // No management link under Stack Management
    expect(footerItems[2]!.sections!.map((s) => s.label)).toMatchInlineSnapshot(`
      Array [
        "Ingest",
        "Data",
        "Alerts and Insights",
        "Security",
        "Kibana",
        "Stack",
      ]
    `);

    // But management panel is considered active
    expect(activeItemId).toBe('stack_management');
  });
});
