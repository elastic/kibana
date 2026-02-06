/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import type { ScoutLogger } from '../../common';
import type { ScoutTestConfig } from '../../types';
import { CollapsibleNav } from './collapsible_nav';
import { DashboardApp } from './dashboard_app';
import { DatePicker } from './date_picker';
import { DiscoverApp } from './discover_app';
import { FilterBar } from './filter_bar';
import { MapsPage } from './maps_page';
import { RenderablePage } from './renderable_page';
import { Toasts } from './toasts';
import { createLazyPageObject } from './utils';
import { Inspector } from './inspector';
import { LensApp } from './lens_app';

export interface PageObjectsFixtures {
  page: ScoutPage;
  config: ScoutTestConfig;
  log: ScoutLogger;
}

export interface PageObjects {
  datePicker: DatePicker;
  discover: DiscoverApp;
  dashboard: DashboardApp;
  filterBar: FilterBar;
  maps: MapsPage;
  renderable: RenderablePage;
  collapsibleNav: CollapsibleNav;
  toasts: Toasts;
  inspector: Inspector;
  lens: LensApp;
}

/**
 * Creates a set of core page objects, each lazily instantiated on first access.
 *
 * @param page - `ScoutPage` instance used for initializing page objects.
 * @returns An object containing lazy-loaded core page objects.
 */
export function createCorePageObjects(fixtures: PageObjectsFixtures): PageObjects {
  return {
    datePicker: createLazyPageObject(DatePicker, fixtures.page),
    dashboard: createLazyPageObject(DashboardApp, fixtures.page),
    discover: createLazyPageObject(DiscoverApp, fixtures.page),
    filterBar: createLazyPageObject(FilterBar, fixtures.page),
    maps: createLazyPageObject(MapsPage, fixtures.page),
    renderable: createLazyPageObject(RenderablePage, fixtures.page),
    collapsibleNav: createLazyPageObject(CollapsibleNav, fixtures.page, fixtures.config),
    toasts: createLazyPageObject(Toasts, fixtures.page),
    inspector: createLazyPageObject(Inspector, fixtures.page),
    lens: createLazyPageObject(LensApp, fixtures.page),
    // Add new page objects here
  };
}
