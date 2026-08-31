/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DOC_VIEWER_TABS_EBT_ELEMENT,
  getDefaultDocViewTabEbt,
  getDocViewTabEbtProps,
} from './get_doc_view_tab_ebt_props';

describe('getDefaultDocViewTabEbt', () => {
  it.each([
    ['doc_view_table', 'viewTable'],
    ['doc_view_source', 'viewSource'],
    ['doc_view_logs_overview', 'viewLogsOverview'],
    ['doc_view_obs_traces_overview', 'viewObsTracesOverview'],
    ['custom-tab', 'viewCustomTab'],
    ['customTab', 'viewCustomTab'],
  ])('derives the action from the tab id (%s -> %s)', (tabId, action) => {
    expect(getDefaultDocViewTabEbt(tabId)).toEqual({
      action,
      element: DOC_VIEWER_TABS_EBT_ELEMENT,
    });
  });
});

describe('getDocViewTabEbtProps', () => {
  it('auto-generates the attributes when the doc view does not define them', () => {
    expect(getDocViewTabEbtProps({ id: 'doc_view_table' })).toEqual({
      'data-ebt-action': 'viewTable',
      'data-ebt-element': DOC_VIEWER_TABS_EBT_ELEMENT,
    });
  });

  it('prefers the attributes the doc view defines', () => {
    expect(
      getDocViewTabEbtProps({
        id: 'doc_view_obs_traces_genai',
        ebt: { action: 'viewGenAi', element: 'docViewerTabs' },
      })
    ).toEqual({
      'data-ebt-action': 'viewGenAi',
      'data-ebt-element': 'docViewerTabs',
    });
  });
});
