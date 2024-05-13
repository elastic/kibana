/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonGroup, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';
import { OverlayStart } from '@kbn/core-overlays-browser';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ReactEmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { BehaviorSubject } from 'rxjs';

const toggleViewButtons = [
  {
    id: `viewModeToggle_edit`,
    value: ViewMode.EDIT,
    label: 'Edit mode',
  },
  {
    id: `viewModeToggle_view`,
    value: ViewMode.VIEW,
    label: 'View mode',
  },
];

const viewMode = new BehaviorSubject<ViewMode | undefined>(ViewMode.EDIT);

export const ReactControlExample = ({
  overlays,
  dataViews: dataViewsService,
}: {
  overlays: OverlayStart;
  dataViews: DataViewsPublicPluginStart;
}) => {
  const {
    loading,
    value: dataViews,
    error,
  } = useAsync(async () => {
    return await dataViewsService.find('kibana_sample_data_logs');
  }, []);

  const viewModeSelected = useStateFromPublishingSubject(viewMode);

  if (loading || !dataViews || !dataViews[0].id) return <EuiLoadingSpinner />;

  const fakeParentApi = { viewMode };
  return (
    <>
      <EuiButtonGroup
        legend="This is a basic group"
        options={toggleViewButtons}
        idSelected={`viewModeToggle_${viewModeSelected}`}
        onChange={(_, value) => {
          viewMode.next(value);
        }}
      />
      <EuiSpacer size="m" />
      <ReactEmbeddableRenderer
        hidePanelChrome={true}
        type={CONTROL_GROUP_TYPE}
        parentApi={fakeParentApi} // should be the dashboard
        key={`control_group`}
        state={{
          rawState: {
            controlStyle: 'oneLine',
            chainingSystem: 'HIERARCHICAL',
            showApplySelections: false,
            panelsJSON:
              '{"a957862f-beae-4f0c-8a3a-a6ea4c235651":{"type":"searchControl","order":0,"grow":true,"width":"medium","explicitInput":{"id":"a957862f-beae-4f0c-8a3a-a6ea4c235651","fieldName":"message","title":"Message","grow":true,"width":"medium","searchString": "test","enhancements":{}}}}',
            ignoreParentSettingsJSON:
              '{"ignoreFilters":false,"ignoreQuery":false,"ignoreTimerange":false,"ignoreValidations":false}',
          } as object,
          references: [
            {
              name: 'controlGroup_a957862f-beae-4f0c-8a3a-a6ea4c235651:optionsListDataView',
              type: 'index-pattern',
              id: dataViews[0].id,
            },
          ],
        }}
      />
    </>
  );
};
