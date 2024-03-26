/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createMemoryHistory } from 'history';
import { firstValueFrom, lastValueFrom, take, BehaviorSubject, of, type Observable } from 'rxjs';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  ChromeNavLinks,
  ChromeNavLink,
  ChromeBreadcrumb,
  AppDeepLinkId,
  ChromeProjectNavigationNode,
  NavigationTreeDefinition,
  GroupDefinition,
  SolutionNavigationDefinition,
} from '@kbn/core-chrome-browser';
import { ProjectNavigationService } from './project_navigation_service';

jest.mock('rxjs', () => {
  const original = jest.requireActual('rxjs');
  return {
    ...original,
    debounceTime: () => (source: Observable<any>) => source,
  };
});

const getNavLink = (partial: Partial<ChromeNavLink> = {}): ChromeNavLink => ({
  id: 'kibana',
  title: 'Kibana',
  baseUrl: '/app',
  url: `/app/${partial.id ?? 'kibana'}`,
  href: `/app/${partial.id ?? 'kibana'}`,
  visibleIn: ['globalSearch'],
  ...partial,
});

const getNavLinksService = (ids: Readonly<string[]> = []) => {
  const navLinks = ids.map((id) => getNavLink({ id, title: id.toUpperCase() }));

  const navLinksMock: jest.Mocked<ChromeNavLinks> = {
    getNavLinks$: jest.fn().mockReturnValue(of(navLinks)),
    has: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn().mockReturnValue(navLinks),
    enableForcedAppSwitcherNavigation: jest.fn(),
    getForceAppSwitcherNavigation$: jest.fn(),
  };
  return navLinksMock;
};

const logger = loggerMock.create();

const setup = ({
  locationPathName = '/',
  navLinkIds,
  setChromeStyle = jest.fn(),
}: {
  locationPathName?: string;
  navLinkIds?: Readonly<string[]>;
  setChromeStyle?: () => void;
} = {}) => {
  const history = createMemoryHistory({
    initialEntries: [locationPathName],
  });
  history.replace(locationPathName);

  const projectNavigationService = new ProjectNavigationService();
  const chromeBreadcrumbs$ = new BehaviorSubject<ChromeBreadcrumb[]>([]);
  const navLinksService = getNavLinksService(navLinkIds);
  const application = {
    ...applicationServiceMock.createInternalStartContract(),
    history,
  };
  application.navigateToUrl.mockImplementation(async (url) => {
    history.push(url);
  });
  const projectNavigation = projectNavigationService.start({
    application,
    navLinksService,
    http: httpServiceMock.createStartContract(),
    chromeBreadcrumbs$,
    logger,
    setChromeStyle,
  });

  return { projectNavigation, history, chromeBreadcrumbs$, navLinksService, application };
};

describe('initNavigation()', () => {
  const setupInitNavigation = () => {
    const { projectNavigation } = setup({
      navLinkIds: ['foo', 'bar', 'discover', 'dashboards', 'visualize'],
    });

    const getNavigationTree = () =>
      lastValueFrom(projectNavigation.getNavigationTreeUi$().pipe(take(1)));

    return { projectNavigation, getNavigationTree };
  };

  describe('setup nodes', () => {
    const { projectNavigation, getNavigationTree } = setupInitNavigation();

    beforeAll(() => {
      projectNavigation.initNavigation<any>(
        of({
          body: [
            {
              id: 'group1',
              type: 'navGroup',
              children: [
                { link: 'foo' },
                { link: 'bar', title: 'Custom title' },
                { link: 'unknown' }, // will be filtered out
              ],
            },
            {
              type: 'navGroup', // No group id, should auto generate one
              children: [
                {
                  children: [{ link: 'foo' }],
                },
              ],
            },
            {
              type: 'recentlyAccessed',
            },
            {
              type: 'preset',
              preset: 'analytics',
            },
          ],
          footer: [
            {
              type: 'navGroup', // No group id, should auto generate one
              title: 'Footer group',
              children: [
                {
                  children: [{ link: 'foo' }],
                },
              ],
            },
          ],
        })
      );
    });

    test('should convert link to deepLink and filter out unknown deepLinks', async () => {
      const treeDefinition = await getNavigationTree();
      const [node] = treeDefinition.body as [ChromeProjectNavigationNode];
      expect(node?.children?.length).toBe(2);
    });

    test('should read the title from prop or deeplink', async () => {
      const treeDefinition = await getNavigationTree();
      const [node] = treeDefinition.body as [ChromeProjectNavigationNode];
      expect(node.children![0].title).toBe('FOO');
      expect(node.children![1].title).toBe('Custom title');
    });

    test('should add metadata to node (title, path, href, sideNavStatus...)', async () => {
      const treeDefinition = await getNavigationTree();
      const [node] = treeDefinition.body as [ChromeProjectNavigationNode];
      expect(node.children![0]).toEqual({
        id: 'foo',
        title: 'FOO',
        path: 'group1.foo',
        href: '/app/foo',
        deepLink: getNavLink({ id: 'foo', title: 'FOO' }),
        isElasticInternalLink: false,
        sideNavStatus: 'visible',
      });
      expect(node.children![0].href).toBe(node.children![0]!.deepLink!.href);
    });

    test('should allow href for absolute links', async () => {
      const { projectNavigation: projNavigation, getNavigationTree: getNavTree } =
        setupInitNavigation();
      projNavigation.initNavigation<any>(
        of({
          body: [
            {
              id: 'group1',
              type: 'navGroup',
              children: [
                {
                  id: 'foo',
                  href: 'https://elastic.co',
                },
              ],
            },
          ],
        })
      );
      const treeDefinition = await getNavTree();
      const [node] = treeDefinition.body as [ChromeProjectNavigationNode];
      expect(node.children?.[0].href).toBe('https://elastic.co');
    });

    test('should throw if href is not an absolute links', async () => {
      const { projectNavigation: projNavigation } = setupInitNavigation();

      projNavigation.initNavigation<any>(
        of({
          body: [
            {
              id: 'group1',
              type: 'navGroup',
              children: [
                {
                  id: 'foo',
                  href: '../dashboards',
                },
              ],
            },
          ],
        })
      );

      expect(logger.error).toHaveBeenCalledWith(
        new Error('href must be an absolute URL. Node id [foo].')
      );
    });

    test('should auto generate IDs for groups that dont have one', async () => {
      const treeDefinition = await getNavigationTree();
      const nodesBody = treeDefinition.body as ChromeProjectNavigationNode[];
      expect(nodesBody[1]).toEqual({
        id: 'node-1', // auto generated
        title: '',
        path: 'node-1',
        type: 'navGroup',
        isElasticInternalLink: false,
        sideNavStatus: 'visible',
        children: [
          {
            id: 'node-0', // auto generated
            path: 'node-1.node-0',
            title: '',
            isElasticInternalLink: false,
            sideNavStatus: 'visible',
            children: [
              {
                deepLink: {
                  baseUrl: '/app',
                  href: '/app/foo',
                  id: 'foo',
                  title: 'FOO',
                  url: '/app/foo',
                  visibleIn: ['globalSearch'],
                },
                href: '/app/foo',
                id: 'foo',
                isElasticInternalLink: false,
                path: 'node-1.node-0.foo',
                sideNavStatus: 'visible',
                title: 'FOO',
              },
            ],
          },
        ],
      });

      const nodesFooter = treeDefinition.footer as ChromeProjectNavigationNode[];
      expect(nodesFooter[0]).toEqual({
        id: 'node-4', // auto generated - Counting countinue from the body array length
        title: 'Footer group',
        path: 'node-4',
        type: 'navGroup',
        isElasticInternalLink: false,
        sideNavStatus: 'visible',
        children: [
          {
            id: 'node-0', // auto generated
            path: 'node-4.node-0',
            title: '',
            isElasticInternalLink: false,
            sideNavStatus: 'visible',
            children: [
              {
                deepLink: expect.any(Object), // we are not testing the deepLink here
                href: '/app/foo',
                id: 'foo',
                isElasticInternalLink: false,
                path: 'node-4.node-0.foo',
                sideNavStatus: 'visible',
                title: 'FOO',
              },
            ],
          },
        ],
      });
    });

    test('should leave "recentlyAccessed" as is', async () => {
      const treeDefinition = await getNavigationTree();
      const nodes = treeDefinition.body as ChromeProjectNavigationNode[];
      expect(nodes[2]).toEqual({
        type: 'recentlyAccessed',
      });
    });

    test('should load preset', async () => {
      const treeDefinition = await getNavigationTree();
      const nodes = treeDefinition.body as ChromeProjectNavigationNode[];

      expect(nodes[3]).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "deepLink": Object {
                "baseUrl": "/app",
                "href": "/app/discover",
                "id": "discover",
                "title": "DISCOVER",
                "url": "/app/discover",
                "visibleIn": Array [
                  "globalSearch",
                ],
              },
              "href": "/app/discover",
              "id": "discover",
              "isElasticInternalLink": false,
              "path": "rootNav:analytics.discover",
              "sideNavStatus": "visible",
              "title": "DISCOVER",
            },
            Object {
              "deepLink": Object {
                "baseUrl": "/app",
                "href": "/app/dashboards",
                "id": "dashboards",
                "title": "DASHBOARDS",
                "url": "/app/dashboards",
                "visibleIn": Array [
                  "globalSearch",
                ],
              },
              "href": "/app/dashboards",
              "id": "dashboards",
              "isElasticInternalLink": false,
              "path": "rootNav:analytics.dashboards",
              "sideNavStatus": "visible",
              "title": "DASHBOARDS",
            },
            Object {
              "deepLink": Object {
                "baseUrl": "/app",
                "href": "/app/visualize",
                "id": "visualize",
                "title": "VISUALIZE",
                "url": "/app/visualize",
                "visibleIn": Array [
                  "globalSearch",
                ],
              },
              "href": "/app/visualize",
              "id": "visualize",
              "isElasticInternalLink": false,
              "path": "rootNav:analytics.visualize",
              "sideNavStatus": "visible",
              "title": "VISUALIZE",
            },
          ],
          "deepLink": undefined,
          "href": undefined,
          "icon": "stats",
          "id": "rootNav:analytics",
          "isElasticInternalLink": false,
          "path": "rootNav:analytics",
          "renderAs": "accordion",
          "sideNavStatus": "visible",
          "title": "Data exploration",
          "type": "navGroup",
        }
      `);
    });
  });

  test('should handle race condition when initNavigation() is called after getNavigationTreeUi$()', async () => {
    const { projectNavigation } = setup({ navLinkIds: ['foo', 'bar'] });

    // 1. getNavigationTreeUi$() is called
    const promise = lastValueFrom(projectNavigation.getNavigationTreeUi$().pipe(take(1)));

    // 2. initNavigation() is called
    projectNavigation.initNavigation<any>(
      of({
        body: [
          {
            id: 'group1',
            type: 'navGroup',
            children: [{ link: 'foo' }],
          },
        ],
      })
    );

    // 3. getNavigationTreeUi$() is resolved
    const treeDefinition = await promise;
    const [node] = treeDefinition.body as [ChromeProjectNavigationNode];
    expect(node.children![0].title).toBe('FOO');
  });

  test('should add the Cloud links to the navigation tree', async () => {
    const { projectNavigation } = setup();
    projectNavigation.setCloudUrls({
      usersAndRolesUrl: 'https://cloud.elastic.co/userAndRoles/', // trailing slash should be removed!
      performanceUrl: 'https://cloud.elastic.co/performance/',
      billingUrl: 'https://cloud.elastic.co/billing/',
      deploymentUrl: 'https://cloud.elastic.co/deployment/',
    });

    projectNavigation.initNavigation<any>(
      // @ts-expect-error - We pass a non valid cloudLink that is not TS valid
      of({
        body: [
          {
            id: 'group1',
            type: 'navGroup',
            children: [
              { cloudLink: 'userAndRoles' },
              { cloudLink: 'performance' },
              { cloudLink: 'billingAndSub' },
              { cloudLink: 'deployment' },
              { cloudLink: 'unknown' }, // Should be filtered out
            ],
          },
        ],
      })
    );

    const treeDefinition = await lastValueFrom(
      projectNavigation.getNavigationTreeUi$().pipe(take(1))
    );
    const [node] = treeDefinition.body as [ChromeProjectNavigationNode];
    expect(node?.children?.length).toBe(4);

    // userAndRoles
    expect(node.children![0]).toEqual({
      deepLink: undefined,
      href: 'https://cloud.elastic.co/userAndRoles',
      id: 'node-0',
      isElasticInternalLink: true,
      path: 'group1.node-0',
      sideNavStatus: 'visible',
      title: 'Users and roles',
    });

    // performance
    expect(node.children![1]).toEqual({
      deepLink: undefined,
      href: 'https://cloud.elastic.co/performance',
      id: 'node-1',
      isElasticInternalLink: true,
      path: 'group1.node-1',
      sideNavStatus: 'visible',
      title: 'Performance',
    });

    // billingAndSub
    expect(node.children![2]).toEqual({
      deepLink: undefined,
      href: 'https://cloud.elastic.co/billing',
      id: 'node-2',
      isElasticInternalLink: true,
      path: 'group1.node-2',
      sideNavStatus: 'visible',
      title: 'Billing and subscription',
    });

    // deployment
    expect(node.children![3]).toEqual({
      deepLink: undefined,
      href: 'https://cloud.elastic.co/deployment',
      id: 'node-3',
      isElasticInternalLink: true,
      path: 'group1.node-3',
      sideNavStatus: 'visible',
      title: 'Project',
    });
  });
});

describe('breadcrumbs', () => {
  const setupWithNavTree = (initiateNavigation = true) => {
    const currentLocationPathName = '/app/navItem1';
    const { projectNavigation, chromeBreadcrumbs$, history } = setup({
      locationPathName: currentLocationPathName,
      navLinkIds: ['navItem1'],
    });

    const mockNavigation: NavigationTreeDefinition<any> = {
      body: [
        {
          id: 'root',
          title: 'Root',
          breadcrumbStatus: 'hidden' as 'hidden',
          type: 'navGroup',
          children: [
            {
              id: 'subNav',
              title: '', // intentionally empty to skip rendering
              children: [
                {
                  link: 'navItem1',
                  title: 'Nav Item 1',
                },
              ],
            },
          ],
        },
      ],
    };

    const subj = new BehaviorSubject<NavigationTreeDefinition<any>>(mockNavigation);
    const obs = subj.asObservable();

    if (initiateNavigation) {
      projectNavigation.initNavigation(obs);
    }

    return {
      projectNavigation,
      history,
      mockNavigation,
      chromeBreadcrumbs$,
      updateDefinition: subj.next.bind(subj),
    };
  };

  test('should set breadcrumbs home / nav / custom', async () => {
    const { projectNavigation } = setupWithNavTree();

    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toMatchInlineSnapshot(`
      Array [
        Object {
          "popoverContent": <EuiContextMenuPanelClass
            items={
              Array [
                <EuiContextMenuItem
                  icon="gear"
                >
                  <FormattedMessage
                    defaultMessage="Manage project"
                    id="core.ui.primaryNav.cloud.linkToProject"
                    values={Object {}}
                  />
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  icon="grid"
                >
                  <FormattedMessage
                    defaultMessage="View all projects"
                    id="core.ui.primaryNav.cloud.linkToAllProjects"
                    values={Object {}}
                  />
                </EuiContextMenuItem>,
              ]
            }
            size="s"
          />,
          "popoverProps": Object {
            "panelPaddingSize": "none",
          },
          "style": Object {
            "maxWidth": "320px",
          },
          "text": "Project",
        },
        Object {
          "deepLinkId": "navItem1",
          "href": "/app/navItem1",
          "text": "Nav Item 1",
        },
        Object {
          "href": "/custom1",
          "text": "custom1",
        },
        Object {
          "href": "/custom1/custom2",
          "text": "custom2",
        },
      ]
    `);
  });

  test('should skip the default navigation from project navigation when absolute: true is used', async () => {
    const { projectNavigation } = setupWithNavTree();

    projectNavigation.setProjectBreadcrumbs(
      [
        { text: 'custom1', href: '/custom1' },
        { text: 'custom2', href: '/custom1/custom2' },
      ],
      { absolute: true }
    );

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toMatchInlineSnapshot(`
      Array [
        Object {
          "popoverContent": <EuiContextMenuPanelClass
            items={
              Array [
                <EuiContextMenuItem
                  icon="gear"
                >
                  <FormattedMessage
                    defaultMessage="Manage project"
                    id="core.ui.primaryNav.cloud.linkToProject"
                    values={Object {}}
                  />
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  icon="grid"
                >
                  <FormattedMessage
                    defaultMessage="View all projects"
                    id="core.ui.primaryNav.cloud.linkToAllProjects"
                    values={Object {}}
                  />
                </EuiContextMenuItem>,
              ]
            }
            size="s"
          />,
          "popoverProps": Object {
            "panelPaddingSize": "none",
          },
          "style": Object {
            "maxWidth": "320px",
          },
          "text": "Project",
        },
        Object {
          "href": "/custom1",
          "text": "custom1",
        },
        Object {
          "href": "/custom1/custom2",
          "text": "custom2",
        },
      ]
    `);
  });

  test('should merge nav breadcrumbs and chrome breadcrumbs', async () => {
    const { projectNavigation, chromeBreadcrumbs$ } = setupWithNavTree();

    projectNavigation.setProjectBreadcrumbs([]);
    chromeBreadcrumbs$.next([
      { text: 'Kibana' },
      { deepLinkId: 'navItem1' as AppDeepLinkId, text: 'Nav Item 1 from Chrome' },
      { text: 'Deep context from Chrome' },
    ]);

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toMatchInlineSnapshot(`
      Array [
        Object {
          "popoverContent": <EuiContextMenuPanelClass
            items={
              Array [
                <EuiContextMenuItem
                  icon="gear"
                >
                  <FormattedMessage
                    defaultMessage="Manage project"
                    id="core.ui.primaryNav.cloud.linkToProject"
                    values={Object {}}
                  />
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  icon="grid"
                >
                  <FormattedMessage
                    defaultMessage="View all projects"
                    id="core.ui.primaryNav.cloud.linkToAllProjects"
                    values={Object {}}
                  />
                </EuiContextMenuItem>,
              ]
            }
            size="s"
          />,
          "popoverProps": Object {
            "panelPaddingSize": "none",
          },
          "style": Object {
            "maxWidth": "320px",
          },
          "text": "Project",
        },
        Object {
          "deepLinkId": "navItem1",
          "text": "Nav Item 1 from Chrome",
        },
        Object {
          "text": "Deep context from Chrome",
        },
      ]
    `);
  });

  test('should reset custom breadcrumbs when active path changes', async () => {
    const { projectNavigation, history } = setupWithNavTree();
    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);

    let breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(4);
    history.push('/foo/item2');
    breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(1); // only home is left
  });

  // this handles race condition where the `initNavigation` call happens after the app called `setProjectBreadcrumbs`
  test("shouldn't reset initial deep context breadcrumbs", async () => {
    const { projectNavigation, mockNavigation } = setupWithNavTree(false);
    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);
    projectNavigation.initNavigation(of(mockNavigation)); // init navigation

    const breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(4);
  });

  test("shouldn't reset custom breadcrumbs when nav node contents changes, but not the path", async () => {
    const { projectNavigation, mockNavigation, updateDefinition } = setupWithNavTree();
    projectNavigation.setProjectBreadcrumbs([
      { text: 'custom1', href: '/custom1' },
      { text: 'custom2', href: '/custom1/custom2' },
    ]);
    let breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(4);

    // navigation node contents changed, but not the path
    const [node] = mockNavigation.body as [GroupDefinition];
    updateDefinition({
      body: [{ ...node, title: 'Changed title' }, ...mockNavigation.body],
    });

    // context breadcrumbs should not reset
    breadcrumbs = await firstValueFrom(projectNavigation.getProjectBreadcrumbs$());
    expect(breadcrumbs).toHaveLength(4);
  });
});

describe('getActiveNodes$()', () => {
  test('should set the active nodes from history location', async () => {
    const currentLocationPathName = '/app/item1';
    const { projectNavigation } = setup({
      locationPathName: currentLocationPathName,
      navLinkIds: ['item1'],
    });

    let activeNodes = await lastValueFrom(projectNavigation.getActiveNodes$().pipe(take(1)));
    expect(activeNodes).toEqual([]);

    projectNavigation.initNavigation<any>(
      of({
        body: [
          {
            id: 'root',
            title: 'Root',
            type: 'navGroup',
            children: [
              {
                link: 'item1',
              },
            ],
          },
        ],
      })
    );

    activeNodes = await lastValueFrom(projectNavigation.getActiveNodes$().pipe(take(1)));

    expect(activeNodes).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
          isElasticInternalLink: false,
          sideNavStatus: 'visible',
          type: 'navGroup',
        },
        {
          id: 'item1',
          title: 'ITEM1',
          path: 'root.item1',
          isElasticInternalLink: false,
          sideNavStatus: 'visible',
          href: '/app/item1',
          deepLink: {
            id: 'item1',
            title: 'ITEM1',
            baseUrl: '/app',
            url: '/app/item1',
            href: '/app/item1',
            visibleIn: ['globalSearch'],
          },
        },
      ],
    ]);
  });

  test('should set the active nodes from getIsActive() handler', async () => {
    const { projectNavigation } = setup({ navLinkIds: ['item1'] });

    let activeNodes = await lastValueFrom(projectNavigation.getActiveNodes$().pipe(take(1)));
    expect(activeNodes).toEqual([]);

    projectNavigation.initNavigation<any>(
      of({
        body: [
          {
            id: 'root',
            title: 'Root',
            type: 'navGroup',
            children: [
              {
                link: 'item1',
                getIsActive: () => true,
              },
            ],
          },
        ],
      })
    );

    activeNodes = await lastValueFrom(projectNavigation.getActiveNodes$().pipe(take(1)));

    expect(activeNodes).toEqual([
      [
        {
          id: 'root',
          title: 'Root',
          path: 'root',
          isElasticInternalLink: false,
          sideNavStatus: 'visible',
          type: 'navGroup',
        },
        {
          id: 'item1',
          title: 'ITEM1',
          path: 'root.item1',
          isElasticInternalLink: false,
          sideNavStatus: 'visible',
          href: '/app/item1',
          deepLink: {
            id: 'item1',
            title: 'ITEM1',
            baseUrl: '/app',
            url: '/app/item1',
            href: '/app/item1',
            visibleIn: ['globalSearch'],
          },
          getIsActive: expect.any(Function),
        },
      ],
    ]);
  });
});

describe('solution navigations', () => {
  const solution1: SolutionNavigationDefinition<any> = {
    id: 'solution1',
    title: 'Solution 1',
    icon: 'logoSolution1',
    homePage: 'discover',
    navigationTree$: of({ body: [{ type: 'navItem', link: 'app1' }] }),
  };

  const solution2: SolutionNavigationDefinition<any> = {
    id: 'solution2',
    title: 'Solution 2',
    icon: 'logoSolution2',
    homePage: 'app2',
    navigationTree$: of({ body: [{ type: 'navItem', link: 'app2' }] }),
    sideNavComponent: () => null,
  };

  const solution3: SolutionNavigationDefinition<any> = {
    id: 'solution3',
    title: 'Solution 3',
    icon: 'logoSolution3',
    homePage: 'discover',
    navigationTree$: of({ body: [{ type: 'navItem', link: 'app3' }] }),
  };

  const localStorageGetItem = jest.fn();
  const originalLocalStorage = window.localStorage;

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: localStorageGetItem,
      },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  it('should update the solution navigation definition', async () => {
    const { projectNavigation } = setup();

    {
      const solutionNavs = await lastValueFrom(
        projectNavigation.getSolutionsNavDefinitions$().pipe(take(1))
      );
      expect(solutionNavs).toEqual({});
    }

    {
      projectNavigation.updateSolutionNavigations({ 1: solution1, 2: solution2 });

      const solutionNavs = await lastValueFrom(
        projectNavigation.getSolutionsNavDefinitions$().pipe(take(1))
      );
      expect(solutionNavs).toEqual({ 1: solution1, 2: solution2 });
    }

    {
      // Test partial update
      projectNavigation.updateSolutionNavigations({ 3: solution3 }, false);
      const solutionNavs = await lastValueFrom(
        projectNavigation.getSolutionsNavDefinitions$().pipe(take(1))
      );
      expect(solutionNavs).toEqual({ 1: solution1, 2: solution2, 3: solution3 });
    }

    {
      // Test full replacement
      projectNavigation.updateSolutionNavigations({ 4: solution3 }, true);
      const solutionNavs = await lastValueFrom(
        projectNavigation.getSolutionsNavDefinitions$().pipe(take(1))
      );
      expect(solutionNavs).toEqual({ 4: solution3 });
    }
  });

  it('should return the active solution navigation', async () => {
    const { projectNavigation } = setup();

    {
      const activeSolution = await lastValueFrom(
        projectNavigation.getActiveSolutionNavDefinition$().pipe(take(1))
      );
      expect(activeSolution).toBeNull();
    }

    projectNavigation.changeActiveSolutionNavigation('2'); // Set **before** the navs are registered
    projectNavigation.updateSolutionNavigations({ 1: solution1, 2: solution2 });

    {
      const activeSolution = await lastValueFrom(
        projectNavigation.getActiveSolutionNavDefinition$().pipe(take(1))
      );
      expect(activeSolution).not.toBeNull();
      // sideNavComponentGetter should not be exposed to consumers
      expect('sideNavComponent' in activeSolution!).toBe(false);
      const { sideNavComponent, ...rest } = solution2;
      expect(activeSolution).toEqual(rest);
    }

    projectNavigation.changeActiveSolutionNavigation('1'); // Set **after** the navs are registered

    {
      const activeSolution = await lastValueFrom(
        projectNavigation.getActiveSolutionNavDefinition$().pipe(take(1))
      );
      expect(activeSolution).toEqual(solution1);
    }
  });

  it('should throw if the active solution navigation is not registered', async () => {
    const { projectNavigation } = setup();

    projectNavigation.updateSolutionNavigations({ 1: solution1, 2: solution2 });

    expect(() => {
      projectNavigation.changeActiveSolutionNavigation('3');
    }).toThrowErrorMatchingInlineSnapshot(
      `"Solution navigation definition with id \\"3\\" does not exist."`
    );
  });

  it('should set the Chrome style when the active solution navigation changes', async () => {
    const setChromeStyle = jest.fn();
    const { projectNavigation } = setup({ setChromeStyle });

    expect(setChromeStyle).not.toHaveBeenCalled();

    projectNavigation.updateSolutionNavigations({ 1: solution1, 2: solution2 });
    expect(setChromeStyle).not.toHaveBeenCalled();

    projectNavigation.changeActiveSolutionNavigation('2');
    expect(setChromeStyle).toHaveBeenCalledWith('project'); // We have an active solution nav, we should switch to project style

    projectNavigation.changeActiveSolutionNavigation(null);
    expect(setChromeStyle).toHaveBeenCalledWith('classic'); // No active solution, we should switch back to classic Kibana
  });

  it('should change the active solution if no node match the current Location', async () => {
    const { projectNavigation, navLinksService } = setup({
      locationPathName: '/app/app3', // we are on app3 which only exists in solution3
      navLinkIds: ['app1', 'app2', 'app3'],
    });

    const getActiveDefinition = () =>
      lastValueFrom(projectNavigation.getActiveSolutionNavDefinition$().pipe(take(1)));

    projectNavigation.updateSolutionNavigations({ 1: solution1, 2: solution2, 3: solution3 });

    {
      const definition = await getActiveDefinition();
      expect(definition).toBe(null); // No active solution id yet
    }

    // Change to solution 2, but we are still on '/app/app3' which only exists in solution3
    projectNavigation.changeActiveSolutionNavigation('2');

    {
      const definition = await getActiveDefinition();
      expect(definition?.id).toBe('solution3'); // The solution3 was activated as it matches the "/app/app3" location
    }

    navLinksService.get.mockReturnValue({ url: '/app/app2', href: '/app/app2' } as any);
    projectNavigation.changeActiveSolutionNavigation('2', { redirect: true }); // We ask to redirect to the home page of solution 2
    {
      const definition = await getActiveDefinition();
      expect(definition?.id).toBe('solution2');
    }

    navLinksService.get.mockReset();
  });
});
