/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  from,
  map,
  Observable,
  of,
  ReplaySubject,
  shareReplay,
  skipWhile,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { SecurityPluginStart, UserMenuLink } from '@kbn/security-plugin/public';
import type { SolutionNavigationDefinition } from '@kbn/core-chrome-browser';
import { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { PanelContentProvider } from '@kbn/shared-ux-chrome-navigation';
import { UserProfileData } from '@kbn/user-profile-components';
import { ENABLE_SOLUTION_NAV_UI_SETTING_ID, SOLUTION_NAV_FEATURE_FLAG_NAME } from '../common';
import type {
  NavigationPublicSetup,
  NavigationPublicStart,
  NavigationPublicSetupDependencies,
  NavigationPublicStartDependencies,
  ConfigSchema,
  AddSolutionNavigationArg,
  SolutionType,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top_nav_menu';
import { RegisteredTopNavMenuData } from './top_nav_menu/top_nav_menu_data';
import { SideNavComponent } from './side_navigation';
import { SolutionNavUserProfileToggle } from './solution_nav_userprofile_toggle';

const DEFAULT_OPT_OUT_NEW_NAV = false;

export class NavigationPublicPlugin
  implements
    Plugin<
      NavigationPublicSetup,
      NavigationPublicStart,
      NavigationPublicSetupDependencies,
      NavigationPublicStartDependencies
    >
{
  private readonly topNavMenuExtensionsRegistry: TopNavMenuExtensionsRegistry =
    new TopNavMenuExtensionsRegistry();
  private readonly stop$ = new ReplaySubject<void>(1);
  private coreStart?: CoreStart;
  private depsStart?: NavigationPublicStartDependencies;
  private isSolutionNavEnabled$ = of(false);
  private userProfileOptOut$: Observable<boolean | undefined> = of(undefined);
  private userProfileMenuItemAdded = false;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(_core: CoreSetup): NavigationPublicSetup {
    return {
      registerMenuItem: this.topNavMenuExtensionsRegistry.register.bind(
        this.topNavMenuExtensionsRegistry
      ),
    };
  }

  public start(
    core: CoreStart,
    depsStart: NavigationPublicStartDependencies
  ): NavigationPublicStart {
    this.coreStart = core;
    this.depsStart = depsStart;

    const { unifiedSearch, cloud, security, cloudExperiments } = depsStart;
    const extensions = this.topNavMenuExtensionsRegistry.getAll();
    const chrome = core.chrome as InternalChromeStart;

    if (security) {
      this.userProfileOptOut$ = security.userProfiles.userProfileLoaded$.pipe(
        skipWhile((loaded) => {
          return !loaded;
        }),
        switchMap(() => {
          return security.userProfiles.userProfile$ as Observable<UserProfileData>;
        }),
        map((profile) => {
          return profile?.userSettings?.solutionNavOptOut;
        }),
        distinctUntilChanged()
      );
    }

    /*
     *
     *  This helps clients of navigation to create
     *  a TopNav Search Bar which does not uses global unifiedSearch/data/query service
     *
     *  Useful in creating multiple stateful SearchBar in the same app without affecting
     *  global filters
     *
     * */
    const createCustomTopNav = (
      /*
       * Custom instance of unified search if it needs to be overridden
       *
       * */
      customUnifiedSearch?: UnifiedSearchPublicPluginStart,
      customExtensions?: RegisteredTopNavMenuData[]
    ) => {
      return createTopNav(customUnifiedSearch ?? unifiedSearch, customExtensions ?? extensions);
    };

    const config = this.initializerContext.config.get();
    const {
      solutionNavigation: { defaultSolution },
    } = config;

    const onCloud = cloud !== undefined; // The new side nav will initially only be available to cloud users
    const isServerless = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';

    let isSolutionNavExperiementEnabled$ = of(false);
    this.isSolutionNavEnabled$ = of(false);

    if (cloudExperiments) {
      isSolutionNavExperiementEnabled$ =
        !onCloud || isServerless
          ? of(false)
          : from(
              cloudExperiments
                .getVariation(SOLUTION_NAV_FEATURE_FLAG_NAME, false)
                .catch(() => false)
            ).pipe(shareReplay(1));

      this.isSolutionNavEnabled$ = isSolutionNavExperiementEnabled$.pipe(
        switchMap((isFeatureEnabled) => {
          return !isFeatureEnabled
            ? of(false)
            : combineLatest([
                core.settings.globalClient.get$<boolean>(ENABLE_SOLUTION_NAV_UI_SETTING_ID),
                this.userProfileOptOut$,
              ]).pipe(
                takeUntil(this.stop$),
                debounceTime(10),
                map(([enabled, userOptedOut]) => {
                  if (!enabled || userOptedOut === true) return false;
                  return true;
                })
              );
        })
      );
    }

    this.isSolutionNavEnabled$
      .pipe(takeUntil(this.stop$), distinctUntilChanged())
      .subscribe((isSolutionNavEnabled) => {
        if (isServerless) return; // Serverless already controls the chrome style

        chrome.setChromeStyle(isSolutionNavEnabled ? 'project' : 'classic');
      });

    // Initialize the solution navigation if it is enabled
    isSolutionNavExperiementEnabled$.pipe(take(1)).subscribe((isEnabled) => {
      if (!isEnabled) return;

      chrome.project.setCloudUrls(cloud!);
      this.susbcribeToSolutionNavUiSettings({ core, security, defaultSolution });
    });

    return {
      ui: {
        TopNavMenu: createTopNav(unifiedSearch, extensions),
        AggregateQueryTopNavMenu: createTopNav(unifiedSearch, extensions),
        createTopNavWithCustomContext: createCustomTopNav,
      },
      addSolutionNavigation: (solutionNavigation) => {
        firstValueFrom(isSolutionNavExperiementEnabled$).then((isEnabled) => {
          if (!isEnabled) return;
          this.addSolutionNavigation(solutionNavigation);
        });
      },
      isSolutionNavEnabled$: this.isSolutionNavEnabled$,
    };
  }

  public stop() {
    this.stop$.next();
  }

  private susbcribeToSolutionNavUiSettings({
    core,
    security,
    defaultSolution,
  }: {
    core: CoreStart;
    defaultSolution: SolutionType;
    security?: SecurityPluginStart;
  }) {
    const chrome = core.chrome as InternalChromeStart;

    combineLatest([
      core.settings.globalClient.get$<boolean>(ENABLE_SOLUTION_NAV_UI_SETTING_ID),
      this.userProfileOptOut$,
    ])
      .pipe(takeUntil(this.stop$), debounceTime(10))
      .subscribe(([enabled, userOptedOut]) => {
        if (enabled) {
          // Add menu item in the user profile menu to opt in/out of the new navigation
          this.addOptInOutUserProfile({ core, security, userOptedOut });
        } else {
          // TODO. Remove the user profile menu item if the feature is disabled.
          // But first let's wait as maybe there will be a page refresh when opting out.
        }

        if (!enabled || userOptedOut === true) {
          chrome.project.changeActiveSolutionNavigation(null);
          chrome.setChromeStyle('classic');
        } else {
          chrome.project.changeActiveSolutionNavigation(defaultSolution);
        }
      });
  }

  private getSideNavComponent({
    dataTestSubj,
    panelContentProvider,
  }: {
    panelContentProvider?: PanelContentProvider;
    dataTestSubj?: string;
  } = {}): SolutionNavigationDefinition['sideNavComponent'] {
    if (!this.coreStart) throw new Error('coreStart is not available');
    if (!this.depsStart) throw new Error('depsStart is not available');

    const core = this.coreStart;
    const { project } = core.chrome as InternalChromeStart;
    const activeNavigationNodes$ = project.getActiveNavigationNodes$();
    const navigationTreeUi$ = project.getNavigationTreeUi$();

    return () => (
      <SideNavComponent
        navProps={{ navigationTree$: navigationTreeUi$, dataTestSubj, panelContentProvider }}
        deps={{ core, activeNodes$: activeNavigationNodes$ }}
      />
    );
  }

  private addSolutionNavigation(solutionNavigation: AddSolutionNavigationArg) {
    if (!this.coreStart) throw new Error('coreStart is not available');
    const { dataTestSubj, panelContentProvider, ...rest } = solutionNavigation;
    const sideNavComponent = this.getSideNavComponent({ dataTestSubj, panelContentProvider });
    const { project } = this.coreStart.chrome as InternalChromeStart;
    project.updateSolutionNavigations({
      [solutionNavigation.id]: { ...rest, sideNavComponent },
    });
  }

  private addOptInOutUserProfile({
    core,
    security,
    userOptedOut,
  }: {
    core: CoreStart;
    userOptedOut?: boolean;
    security?: SecurityPluginStart;
  }) {
    if (!security || this.userProfileMenuItemAdded) return;

    const defaultOptOutValue = userOptedOut !== undefined ? userOptedOut : DEFAULT_OPT_OUT_NEW_NAV;

    const menuLink: UserMenuLink = {
      content: (
        <SolutionNavUserProfileToggle
          core={core}
          security={security}
          defaultOptOutValue={defaultOptOutValue}
        />
      ),
      order: 500,
      label: '',
      iconType: '',
      href: '',
    };

    security.navControlService.addUserMenuLinks([menuLink]);
    this.userProfileMenuItemAdded = true;
  }
}
