/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type { EuiSideNavItemType, IconType } from '@elastic/eui';
import type { SerializableRecord } from '@kbn/utility-types';

/**
 * TODO move definition from the Share plugin to a package
 * @private
 */
export interface ILocatorPublic {
  navigateSync: <P extends SerializableRecord>(params: P) => void;
}

type GetLocatorFn = (id: string) => ILocatorPublic | undefined;

/**
 * @internal
 */
export interface RecentItem {
  link: string;
  label: string;
  id: string;
}

/**
 * A list of services that are consumed by this component.
 */
export interface NavigationServices {
  getLocator: GetLocatorFn;
  navIsOpen: boolean;
  recentItems: RecentItem[];
}

/**
 * An interface containing a collection of Kibana dependencies required to
 * render this component
 */
export interface NavigationKibanaDependencies {
  share: {
    url: {
      locators: { get: GetLocatorFn };
    };
  };
  core: {
    chrome: {
      getProjectNavIsOpen$: () => Observable<boolean>;
      recentlyAccessed: {
        get$: () => Observable<RecentItem[]>;
      };
    };
  };
}

/**
 * Locator info used for navigating around Kibana
 */
export interface ILocatorDefinition<P = SerializableRecord> {
  /**
   * ID of a registered LocatorDefinition
   */
  id: string;
  /**
   * Navigational params in the form understood by the locator's plugin.
   */
  params?: P;
}

/**
 * Props for the `NavItem` component representing the content of a navigational item with optional children.
 * @public
 */
export type NavItemProps<T = unknown> = Pick<
  EuiSideNavItemType<T>,
  'id' | 'name' | 'forceOpen' | 'isSelected'
> & {
  items?: Array<NavItemProps<T>>;
  /**
   * ID of a registered LocatorDefinition
   */
  locator?: ILocatorDefinition;
};

/**
 * Props for the `Navigation` component.
 */
export interface NavigationProps {
  /**
   * IDs of Navigation sections that should be rendered initially open when the component is mounted
   */
  initiallyOpenSections?: string[];
  /**
   * Items of navigation content
   */
  items?: NavItemProps[];
  /**
   * ID of the item, for highlighting and showing as initially open
   */
  id: string;
  title: {
    /**
     * Name of the project, i.e. "Observability"
     */
    name: React.ReactNode;
    /**
     * Solution logo, i.e. "logoObservability"
     */
    icon: IconType;
  };
  platformSections: {
    analytics?: {
      enabled?: boolean; // default: true
    };
    ml?: {
      enabled?: boolean; // default: true
    };
    devTools?: {
      enabled?: boolean; // default: true
    };
    management?: {
      enabled?: boolean; // default: true
    };
  };
}
