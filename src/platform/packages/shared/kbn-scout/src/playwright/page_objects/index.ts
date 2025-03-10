/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '..';
import { DashboardApp } from './dashboard_app';
import { DatePicker } from './date_picker';
import { DiscoverApp } from './discover_app';
import { FilterBar } from './fiter_bar';
import { MapsPage } from './maps_page';
import { RenderablePage } from './renderable_page';
import { createLazyPageObject } from './utils';

export interface PageObjects {
  datePicker: DatePicker;
  discover: DiscoverApp;
  dashboard: DashboardApp;
  filterBar: FilterBar;
  maps: MapsPage;
  renderable: RenderablePage;
}

/**
 * Creates a set of core page objects, each lazily instantiated on first access.
 *
 * @param page - `ScoutPage` instance used for initializing page objects.
 * @returns An object containing lazy-loaded core page objects.
 */
export function createCorePageObjects(page: ScoutPage): PageObjects {
  return {
    datePicker: createLazyPageObject(DatePicker, page),
    dashboard: createLazyPageObject(DashboardApp, page),
    discover: createLazyPageObject(DiscoverApp, page),
    filterBar: createLazyPageObject(FilterBar, page),
    maps: createLazyPageObject(MapsPage, page),
    renderable: createLazyPageObject(RenderablePage, page),
    // Add new page objects here
  };
}
