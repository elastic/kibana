/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { BehaviorSubject, combineLatest, merge, type Observable, of, ReplaySubject } from 'rxjs';
import { mergeMap, map, takeUntil } from 'rxjs/operators';
import { parse } from 'url';
import { EuiLink } from '@elastic/eui';
import useObservable from 'react-use/lib/useObservable';
import type { InternalInjectedMetadataStart } from '@kbn/core-injected-metadata-browser-internal';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { type DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type {
  ChromeNavLink,
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeUserBanner,
  ChromeStyle,
  ChromeProjectNavigation,
  ChromeSetProjectBreadcrumbsParams,
} from '@kbn/core-chrome-browser';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import type {
  SideNavComponent as ISideNavComponent,
  ChromeHelpMenuLink,
} from '@kbn/core-chrome-browser';

import { DocTitleService } from './doc_title';
import { NavControlsService } from './nav_controls';
import { NavLinksService } from './nav_links';
import { ProjectNavigationService } from './project_navigation';
import { RecentlyAccessedService } from './recently_accessed';
import { Header, LoadingIndicator, ProjectHeader, ProjectSideNavigation } from './ui';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';
import type { InternalChromeStart } from './types';
import { HeaderTopBanner } from './ui/header/header_top_banner';

const IS_LOCKED_KEY = 'core.chrome.isLocked';
const SNAPSHOT_REGEX = /-snapshot/i;

interface ConstructorParams {
  browserSupportsCsp: boolean;
  kibanaVersion: string;
}

export interface SetupDeps {
  analytics: AnalyticsServiceSetup;
}

export interface StartDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
  http: HttpStart;
  injectedMetadata: InternalInjectedMetadataStart;
  notifications: NotificationsStart;
  customBranding: CustomBrandingStart;
}

/** @internal */
export class ChromeService {
  private isVisible$!: Observable<boolean>;
  private isForceHidden$!: BehaviorSubject<boolean>;
  private readonly stop$ = new ReplaySubject<void>(1);
  private readonly navControls = new NavControlsService();
  private readonly navLinks = new NavLinksService();
  private readonly recentlyAccessed = new RecentlyAccessedService();
  private readonly docTitle = new DocTitleService();
  private readonly projectNavigation = new ProjectNavigationService();
  private mutationObserver: MutationObserver | undefined;
  private readonly isSideNavCollapsed$ = new BehaviorSubject<boolean>(true);

  constructor(private readonly params: ConstructorParams) {}

  /**
   * These observables allow consumers to toggle the chrome visibility via either:
   *   1. Using setIsVisible() to trigger the next chromeHidden$
   *   2. Setting `chromeless` when registering an application, which will
   *      reset the visibility whenever the next application is mounted
   *   3. Having "embed" in the query string
   */
  private initVisibility(application: StartDeps['application']) {
    // Start off the chrome service hidden if "embed" is in the hash query string.
    const isEmbedded = 'embed' in parse(location.hash.slice(1), true).query;
    this.isForceHidden$ = new BehaviorSubject(isEmbedded);

    const appHidden$ = merge(
      // For the isVisible$ logic, having no mounted app is equivalent to having a hidden app
      // in the sense that the chrome UI should not be displayed until a non-chromeless app is mounting or mounted
      of(true),
      application.currentAppId$.pipe(
        mergeMap((appId) =>
          application.applications$.pipe(
            map((applications) => {
              return !!appId && applications.has(appId) && !!applications.get(appId)!.chromeless;
            })
          )
        )
      )
    );
    this.isVisible$ = combineLatest([appHidden$, this.isForceHidden$]).pipe(
      map(([appHidden, forceHidden]) => !appHidden && !forceHidden),
      takeUntil(this.stop$)
    );
  }

  private setIsVisible = (isVisible: boolean) => this.isForceHidden$.next(!isVisible);

  /**
   * Some EUI component can be toggled in Full screen (e.g. the EuiDataGrid). When they are toggled in full
   * screen we want to hide the chrome, and when they are toggled back to normal we want to show the chrome.
   */
  private handleEuiFullScreenChanges = () => {
    const { body } = document;
    // HTML class names that are added to the body when Eui components are toggled in full screen
    const classesOnBodyWhenEuiFullScreen = ['euiDataGrid__restrictBody'];

    let isChromeHiddenForEuiFullScreen = false;
    let isChromeVisible = false;

    this.isVisible$.pipe(takeUntil(this.stop$)).subscribe((isVisible) => {
      isChromeVisible = isVisible;
    });

    const onBodyClassesChange = () => {
      const { className } = body;
      if (
        classesOnBodyWhenEuiFullScreen.some((name) => className.includes(name)) &&
        isChromeVisible
      ) {
        isChromeHiddenForEuiFullScreen = true;
        this.setIsVisible(false);
      } else if (
        classesOnBodyWhenEuiFullScreen.every((name) => !className.includes(name)) &&
        !isChromeVisible &&
        isChromeHiddenForEuiFullScreen
      ) {
        isChromeHiddenForEuiFullScreen = false;
        this.setIsVisible(true);
      }
    };

    this.mutationObserver = new MutationObserver((mutationList) => {
      mutationList.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          onBodyClassesChange();
        }
      });
    });

    this.mutationObserver.observe(body, { attributes: true });
  };

  public setup({ analytics }: SetupDeps) {
    const docTitle = this.docTitle.setup({ document: window.document });
    registerAnalyticsContextProvider(analytics, docTitle.title$);
  }

  public async start({
    application,
    docLinks,
    http,
    injectedMetadata,
    notifications,
    customBranding,
  }: StartDeps): Promise<InternalChromeStart> {
    this.initVisibility(application);
    this.handleEuiFullScreenChanges();

    const globalHelpExtensionMenuLinks$ = new BehaviorSubject<ChromeGlobalHelpExtensionMenuLink[]>(
      []
    );
    const helpExtension$ = new BehaviorSubject<ChromeHelpExtension | undefined>(undefined);
    const breadcrumbs$ = new BehaviorSubject<ChromeBreadcrumb[]>([]);
    const breadcrumbsAppendExtension$ = new BehaviorSubject<
      ChromeBreadcrumbsAppendExtension | undefined
    >(undefined);
    const badge$ = new BehaviorSubject<ChromeBadge | undefined>(undefined);
    const customNavLink$ = new BehaviorSubject<ChromeNavLink | undefined>(undefined);
    const helpSupportUrl$ = new BehaviorSubject<string>(docLinks.links.kibana.askElastic);
    const isNavDrawerLocked$ = new BehaviorSubject(localStorage.getItem(IS_LOCKED_KEY) === 'true');
    const chromeStyle$ = new BehaviorSubject<ChromeStyle>('classic');

    const getKbnVersionClass = () => {
      // we assume that the version is valid and has the form 'X.X.X'
      // strip out `SNAPSHOT` and reformat to 'X-X-X'
      const formattedVersionClass = this.params.kibanaVersion
        .replace(SNAPSHOT_REGEX, '')
        .split('.')
        .join('-');
      return `kbnVersion-${formattedVersionClass}`;
    };

    const headerBanner$ = new BehaviorSubject<ChromeUserBanner | undefined>(undefined);
    const bodyClasses$ = combineLatest([
      headerBanner$,
      this.isVisible$!,
      chromeStyle$,
      application.currentActionMenu$,
    ]).pipe(
      map(([headerBanner, isVisible, chromeStyle, actionMenu]) => {
        return [
          'kbnBody',
          headerBanner ? 'kbnBody--hasHeaderBanner' : 'kbnBody--noHeaderBanner',
          isVisible ? 'kbnBody--chromeVisible' : 'kbnBody--chromeHidden',
          chromeStyle === 'project' && actionMenu ? 'kbnBody--hasProjectActionMenu' : '',
          getKbnVersionClass(),
        ].filter((className) => !!className);
      })
    );

    const navControls = this.navControls.start();
    const navLinks = this.navLinks.start({ application, http });
    const projectNavigation = this.projectNavigation.start({
      application,
      navLinks,
      http,
      chromeBreadcrumbs$: breadcrumbs$,
    });
    const recentlyAccessed = await this.recentlyAccessed.start({ http });
    const docTitle = this.docTitle.start();
    const { customBranding$ } = customBranding;
    const helpMenuLinks$ = navControls.getHelpMenuLinks$();

    // erase chrome fields from a previous app while switching to a next app
    application.currentAppId$.subscribe(() => {
      helpExtension$.next(undefined);
      breadcrumbs$.next([]);
      badge$.next(undefined);
      docTitle.reset();
    });

    const setIsNavDrawerLocked = (isLocked: boolean) => {
      isNavDrawerLocked$.next(isLocked);
      localStorage.setItem(IS_LOCKED_KEY, `${isLocked}`);
    };

    const getIsNavDrawerLocked$ = isNavDrawerLocked$.pipe(takeUntil(this.stop$));

    const setChromeStyle = (style: ChromeStyle) => {
      chromeStyle$.next(style);
    };

    const validateChromeStyle = () => {
      const chromeStyle = chromeStyle$.getValue();
      if (chromeStyle !== 'project') {
        // Helps ensure callers go through the serverless plugin to get here.
        throw new Error(
          `Invalid ChromeStyle value of "${chromeStyle}". This method requires ChromeStyle set to "project".`
        );
      }
    };

    const setProjectSideNavComponent = (component: ISideNavComponent | null) => {
      validateChromeStyle();
      projectNavigation.setProjectSideNavComponent(component);
    };

    const setProjectNavigation = (config: ChromeProjectNavigation) => {
      validateChromeStyle();
      projectNavigation.setProjectNavigation(config);
    };

    const setProjectBreadcrumbs = (
      breadcrumbs: ChromeBreadcrumb[] | ChromeBreadcrumb,
      params?: ChromeSetProjectBreadcrumbsParams
    ) => {
      projectNavigation.setProjectBreadcrumbs(breadcrumbs, params);
    };

    const setProjectHome = (homeHref: string) => {
      validateChromeStyle();
      projectNavigation.setProjectHome(homeHref);
    };

    const setProjectsUrl = (projectsUrl: string) => {
      validateChromeStyle();
      projectNavigation.setProjectsUrl(projectsUrl);
    };

    const setProjectName = (projectName: string) => {
      validateChromeStyle();
      projectNavigation.setProjectName(projectName);
    };

    const setProjectUrl = (projectUrl: string) => {
      validateChromeStyle();
      projectNavigation.setProjectUrl(projectUrl);
    };

    const isIE = () => {
      const ua = window.navigator.userAgent;
      const msie = ua.indexOf('MSIE '); // IE 10 or older
      const trident = ua.indexOf('Trident/'); // IE 11

      return msie > 0 || trident > 0;
    };

    if (!this.params.browserSupportsCsp && injectedMetadata.getCspConfig().warnLegacyBrowsers) {
      notifications.toasts.addWarning({
        title: mountReactNode(
          <FormattedMessage
            id="core.chrome.legacyBrowserWarning"
            defaultMessage="Your browser does not meet the security requirements for Kibana."
          />
        ),
      });
    }

    if (isIE()) {
      notifications.toasts.addWarning({
        title: mountReactNode(
          <FormattedMessage
            id="core.chrome.browserDeprecationWarning"
            defaultMessage="Support for Internet Explorer will be dropped in future versions of this software, please check {link}."
            values={{
              link: (
                <EuiLink target="_blank" href="https://www.elastic.co/support/matrix" external>
                  <FormattedMessage
                    id="core.chrome.browserDeprecationLink"
                    defaultMessage="the support matrix on our website"
                  />
                </EuiLink>
              ),
            }}
          />
        ),
      });
    }

    const getHeaderComponent = () => {
      const HeaderComponent = () => {
        const isVisible = useObservable(this.isVisible$);

        if (!isVisible) {
          return (
            <div data-test-subj="kibanaHeaderChromeless">
              <LoadingIndicator loadingCount$={http.getLoadingCount$()} showAsBar />
              <HeaderTopBanner headerBanner$={headerBanner$.pipe(takeUntil(this.stop$))} />
            </div>
          );
        }

        // render header
        if (chromeStyle$.getValue() === 'project') {
          const projectNavigationComponent$ = projectNavigation.getProjectSideNavComponent$();
          const projectBreadcrumbs$ = projectNavigation
            .getProjectBreadcrumbs$()
            .pipe(takeUntil(this.stop$));
          const activeNodes$ = projectNavigation.getActiveNodes$();

          const ProjectHeaderWithNavigationComponent = () => {
            const CustomSideNavComponent = useObservable(projectNavigationComponent$, undefined);
            const activeNodes = useObservable(activeNodes$, []);

            const currentProjectBreadcrumbs$ = projectBreadcrumbs$;

            let SideNavComponent: ISideNavComponent = () => null;

            if (CustomSideNavComponent !== undefined) {
              // We have the state from the Observable
              SideNavComponent =
                CustomSideNavComponent.current !== null
                  ? CustomSideNavComponent.current
                  : ProjectSideNavigation;
            }

            return (
              <ProjectHeader
                application={application}
                globalHelpExtensionMenuLinks$={globalHelpExtensionMenuLinks$}
                actionMenu$={application.currentActionMenu$}
                breadcrumbs$={currentProjectBreadcrumbs$}
                helpExtension$={helpExtension$.pipe(takeUntil(this.stop$))}
                helpSupportUrl$={helpSupportUrl$.pipe(takeUntil(this.stop$))}
                helpMenuLinks$={helpMenuLinks$}
                navControlsLeft$={navControls.getLeft$()}
                navControlsCenter$={navControls.getCenter$()}
                navControlsRight$={navControls.getRight$()}
                loadingCount$={http.getLoadingCount$()}
                headerBanner$={headerBanner$.pipe(takeUntil(this.stop$))}
                homeHref$={projectNavigation.getProjectHome$()}
                docLinks={docLinks}
                kibanaVersion={injectedMetadata.getKibanaVersion()}
                prependBasePath={http.basePath.prepend}
                toggleSideNav={(isCollapsed) => {
                  this.isSideNavCollapsed$.next(isCollapsed);
                }}
              >
                <SideNavComponent activeNodes={activeNodes} />
              </ProjectHeader>
            );
          };

          return <ProjectHeaderWithNavigationComponent />;
        }

        return (
          <Header
            loadingCount$={http.getLoadingCount$()}
            application={application}
            headerBanner$={headerBanner$.pipe(takeUntil(this.stop$))}
            badge$={badge$.pipe(takeUntil(this.stop$))}
            basePath={http.basePath}
            breadcrumbs$={breadcrumbs$.pipe(takeUntil(this.stop$))}
            breadcrumbsAppendExtension$={breadcrumbsAppendExtension$.pipe(takeUntil(this.stop$))}
            customNavLink$={customNavLink$.pipe(takeUntil(this.stop$))}
            kibanaDocLink={docLinks.links.kibana.guide}
            docLinks={docLinks}
            forceAppSwitcherNavigation$={navLinks.getForceAppSwitcherNavigation$()}
            globalHelpExtensionMenuLinks$={globalHelpExtensionMenuLinks$}
            helpExtension$={helpExtension$.pipe(takeUntil(this.stop$))}
            helpSupportUrl$={helpSupportUrl$.pipe(takeUntil(this.stop$))}
            helpMenuLinks$={helpMenuLinks$}
            homeHref={http.basePath.prepend('/app/home')}
            kibanaVersion={injectedMetadata.getKibanaVersion()}
            navLinks$={navLinks.getNavLinks$()}
            recentlyAccessed$={recentlyAccessed.get$()}
            navControlsLeft$={navControls.getLeft$()}
            navControlsCenter$={navControls.getCenter$()}
            navControlsRight$={navControls.getRight$()}
            navControlsExtension$={navControls.getExtension$()}
            onIsLockedUpdate={setIsNavDrawerLocked}
            isLocked$={getIsNavDrawerLocked$}
            customBranding$={customBranding$}
          />
        );
      };

      return <HeaderComponent />;
    };

    return {
      navControls,
      navLinks,
      recentlyAccessed,
      docTitle,
      getHeaderComponent,

      getIsVisible$: () => this.isVisible$,

      setIsVisible: this.setIsVisible.bind(this),

      getBadge$: () => badge$.pipe(takeUntil(this.stop$)),

      setBadge: (badge: ChromeBadge) => {
        badge$.next(badge);
      },

      getBreadcrumbs$: () => breadcrumbs$.pipe(takeUntil(this.stop$)),

      setBreadcrumbs: (newBreadcrumbs: ChromeBreadcrumb[]) => {
        breadcrumbs$.next(newBreadcrumbs);
      },

      getBreadcrumbsAppendExtension$: () => breadcrumbsAppendExtension$.pipe(takeUntil(this.stop$)),

      setBreadcrumbsAppendExtension: (
        breadcrumbsAppendExtension?: ChromeBreadcrumbsAppendExtension
      ) => {
        breadcrumbsAppendExtension$.next(breadcrumbsAppendExtension);
      },

      getGlobalHelpExtensionMenuLinks$: () => globalHelpExtensionMenuLinks$.asObservable(),

      registerGlobalHelpExtensionMenuLink: (
        globalHelpExtensionMenuLink: ChromeGlobalHelpExtensionMenuLink
      ) => {
        globalHelpExtensionMenuLinks$.next([
          ...globalHelpExtensionMenuLinks$.value,
          globalHelpExtensionMenuLink,
        ]);
      },

      getHelpExtension$: () => helpExtension$.pipe(takeUntil(this.stop$)),

      setHelpExtension: (helpExtension?: ChromeHelpExtension) => {
        helpExtension$.next(helpExtension);
      },

      setHelpSupportUrl: (url: string) => helpSupportUrl$.next(url),

      getHelpSupportUrl$: () => helpSupportUrl$.pipe(takeUntil(this.stop$)),

      getIsNavDrawerLocked$: () => getIsNavDrawerLocked$,

      getCustomNavLink$: () => customNavLink$.pipe(takeUntil(this.stop$)),

      setCustomNavLink: (customNavLink?: ChromeNavLink) => {
        customNavLink$.next(customNavLink);
      },

      setHelpMenuLinks: (helpMenuLinks: ChromeHelpMenuLink[]) => {
        navControls.setHelpMenuLinks(helpMenuLinks);
      },

      setHeaderBanner: (headerBanner?: ChromeUserBanner) => {
        headerBanner$.next(headerBanner);
      },

      hasHeaderBanner$: () => {
        return headerBanner$.pipe(
          takeUntil(this.stop$),
          map((banner) => Boolean(banner))
        );
      },

      getBodyClasses$: () => bodyClasses$.pipe(takeUntil(this.stop$)),
      setChromeStyle,
      getChromeStyle$: () => chromeStyle$.pipe(takeUntil(this.stop$)),
      getIsSideNavCollapsed$: () => this.isSideNavCollapsed$.asObservable(),
      project: {
        setHome: setProjectHome,
        setProjectsUrl,
        setProjectUrl,
        setProjectName,
        setNavigation: setProjectNavigation,
        setSideNavComponent: setProjectSideNavComponent,
        setBreadcrumbs: setProjectBreadcrumbs,
        getActiveNavigationNodes$: () => projectNavigation.getActiveNodes$(),
      },
    };
  }

  public stop() {
    this.navLinks.stop();
    this.projectNavigation.stop();
    this.stop$.next();
    this.mutationObserver?.disconnect();
  }
}
