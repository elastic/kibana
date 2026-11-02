/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEbtProps, type EbtClickAttrs } from '@kbn/ebt-click';
import type { DocView } from '../../services/types';

/** `data-ebt-element` applied to every doc viewer tab button. */
export const DOC_VIEWER_TABS_EBT_ELEMENT = 'docViewerTabs';

const DOC_VIEW_ID_PREFIX = 'doc_view_';

const toPascalCase = (value: string) =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/**
 * Default EBT click attributes for a doc viewer tab: the `data-ebt-action` is
 * derived from the tab id (e.g. `doc_view_table` -> `viewTable`).
 */
export const getDefaultDocViewTabEbt = (tabId: string): EbtClickAttrs => ({
  action: `view${toPascalCase(
    tabId.startsWith(DOC_VIEW_ID_PREFIX) ? tabId.slice(DOC_VIEW_ID_PREFIX.length) : tabId
  )}`,
  element: DOC_VIEWER_TABS_EBT_ELEMENT,
});

/**
 * `data-ebt-*` click attributes for a doc viewer tab button. Every tab gets
 * auto-generated attributes; a doc view can override them via its `ebt` field
 * (e.g. to share an action name with equivalent tabs on other surfaces).
 */
export const getDocViewTabEbtProps = (docView: Pick<DocView, 'id' | 'ebt'>) =>
  getEbtProps(docView.ebt ?? getDefaultDocViewTabEbt(docView.id));
