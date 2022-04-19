/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '@kbn/core/public';
import type { Serializable } from '@kbn/utility-types';

import { GridData } from '..';

interface SavedObjectAttributes {
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
}

interface Doc<Attributes extends SavedObjectAttributes = SavedObjectAttributes> {
  references: SavedObjectReference[];
  attributes: Attributes;
  id: string;
  type: string;
}

interface DocPre700<Attributes extends SavedObjectAttributes = SavedObjectAttributes> {
  attributes: Attributes;
  id: string;
  type: string;
}

interface DashboardAttributes extends SavedObjectAttributes {
  panelsJSON: string;
  description: string;
  version: number;
  timeRestore: boolean;
  useMargins?: boolean;
  title: string;
  optionsJSON?: string;
}

interface DashboardAttributesTo720 extends SavedObjectAttributes {
  panelsJSON: string;
  description: string;
  uiStateJSON?: string;
  version: number;
  timeRestore: boolean;
  useMargins?: boolean;
  title: string;
  optionsJSON?: string;
}

export type DashboardDoc730ToLatest = Doc<DashboardAttributes>;

export type DashboardDoc700To720 = Doc<DashboardAttributesTo720>;

export type DashboardDocPre700 = DocPre700<DashboardAttributesTo720>;

// Note that these types are prefixed with `Raw` because there are some post processing steps
// that happen before the saved objects even reach the client. Namely, injecting type and id
// parameters back into the panels, where the raw saved objects actually have them stored elsewhere.
//
// Ideally, everywhere in the dashboard code would use references at the top level instead of
// embedded in the panels. The reason this is stored at the top level is so the references can be uniformly
// updated across all saved object types that have references.

// Starting in 7.3 we introduced the possibility of embeddables existing without an id
// parameter.  If there was no id, then type remains on the panel.  So it either will have a name,
// or a type property.
export type RawSavedDashboardPanel730ToLatest = Pick<
  RawSavedDashboardPanel640To720,
  Exclude<keyof RawSavedDashboardPanel640To720, 'name'>
> & {
  // Should be either type, and not name (not backed by a saved object), or name but not type (backed by a
  // saved object and type and id are stored on references).  Had trouble with oring the two types
  // because of optional properties being marked as required: https://github.com/microsoft/TypeScript/issues/20722
  readonly type?: string;
  readonly name?: string;

  panelIndex: string;
  panelRefName?: string;
};

// NOTE!!
// All of these types can actually exist in 7.2!  The names are pretty confusing because we did
// in place migrations for so long. For example, `RawSavedDashboardPanelTo60` is what a panel
// created in 6.0 will look like after it's been migrated up to 7.2, *not* what it would look like in 6.0.
// That's why it actually doesn't have id or type, but has a name property, because that was a migration
// added in 7.0.

// Hopefully since we finally have a formal saved object migration system and we can do less in place
// migrations, this will be easier to understand moving forward.

// Starting in 6.4 we added an in-place edit on panels to remove columns and sort properties and put them
// inside the embeddable config (https://github.com/elastic/kibana/pull/17446).
// Note that this was not added as a saved object migration until 7.3, so there can still exist panels in
// this shape in v 7.2.
export type RawSavedDashboardPanel640To720 = Pick<
  RawSavedDashboardPanel630,
  Exclude<keyof RawSavedDashboardPanel630, 'columns' | 'sort'>
>;

// In 6.3.0 we expanded the number of grid columns and rows: https://github.com/elastic/kibana/pull/16763
// We added in-place migrations to multiply older x,y,h,w numbers. Note the typescript shape here is the same
// because it's just multiplying existing fields.
// Note that this was not added as a saved object migration until 7.3, so there can still exist panels in 7.2
// that need to be modified.
export type RawSavedDashboardPanel630 = RawSavedDashboardPanel620;

// In 6.2 we added an inplace migration, moving uiState into each panel's new embeddableConfig property.
// Source: https://github.com/elastic/kibana/pull/14949
export type RawSavedDashboardPanel620 = RawSavedDashboardPanel610 & {
  embeddableConfig: { [key: string]: Serializable };
  version: string;
};

// In 6.1 we switched from an angular grid to react grid layout (https://github.com/elastic/kibana/pull/13853)
// This used gridData instead of size_x, size_y, row and col. We also started tracking the version this panel
// was created in to make future migrations easier.
// Note that this was not added as a saved object migration until 7.3, so there can still exist panels in
// this shape in v 7.2.
export type RawSavedDashboardPanel610 = Pick<
  RawSavedDashboardPanelTo60,
  Exclude<keyof RawSavedDashboardPanelTo60, 'size_x' | 'size_y' | 'col' | 'row'>
> & { gridData: GridData; version: string };

export interface RawSavedDashboardPanelTo60 {
  readonly columns?: string[];
  readonly sort?: string;
  readonly size_x?: number;
  readonly size_y?: number;
  readonly row: number;
  readonly col: number;
  panelIndex?: number | string; // earlier versions allowed this to be number or string. Some very early versions seem to be missing this entirely
  readonly name: string;

  // This is where custom panel titles are stored prior to Embeddable API v2
  title?: string;
}
