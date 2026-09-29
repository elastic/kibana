/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { InlineDataViewService } from './inline_data_view_service';

/** Gives views created or copied in the shared editor their inline identity for Discover. */
export const createDiscoverDataViewEditorAdapter = ({
  dataViewEditor,
  dataViews,
  inlineDataViews,
}: {
  dataViewEditor: DataViewEditorStart;
  dataViews: Pick<DataViewsContract, 'clearInstanceCache'>;
  inlineDataViews: InlineDataViewService;
}): DataViewEditorStart => ({
  ...dataViewEditor,
  openEditor: (options) => {
    // The editor changes existing views in place; managed views can only be copied.
    if (options.editData && !options.isDuplicating && !options.editData.managed) {
      return dataViewEditor.openEditor(options);
    }

    const onSaveInlineDataView = async (createdDataView: DataView) => {
      const finalizedDataView = await inlineDataViews.finalize(createdDataView);

      // Requires the editor to reject custom IDs when a view is used without saving, including
      // Duplicate; otherwise a cached view could be returned here and evicted.
      if (createdDataView.id && createdDataView.id !== finalizedDataView.id) {
        dataViews.clearInstanceCache(createdDataView.id);
      }

      return options.onSave(finalizedDataView);
    };

    return dataViewEditor.openEditor({
      ...options,
      onSave: (createdDataView) =>
        createdDataView.isPersisted()
          ? options.onSave(createdDataView)
          : onSaveInlineDataView(createdDataView),
    });
  },
});
