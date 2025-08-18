/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { RouteComponentProps } from 'react-router-dom';
import { useLocation, withRouter } from 'react-router-dom';
import { DataViewType } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import type { IndexPatternManagmentContext } from '../../types';
import { IndexPatternTableWithRouter } from './index_pattern_table';

interface Props extends RouteComponentProps {
  canSave: boolean;
  showCreateDialog?: boolean;
}

const title = i18n.translate('indexPatternManagement.dataViewTable.title', {
  defaultMessage: 'Data Views',
});

export const IndexPatternTableContainer = ({
  history,
  canSave,
  showCreateDialog: initialShowCreateDialog = false,
}: Props) => {
  const { dataViews, IndexPatternEditor } = useKibana<IndexPatternManagmentContext>().services;
  const [showCreateDialog, setShowCreateDialog] = useState(initialShowCreateDialog ?? false);
  const isRollup =
    new URLSearchParams(useLocation().search).get('type') === DataViewType.ROLLUP &&
    dataViews.getRollupsEnabled();
  return (
    <div data-test-subj="indexPatternTable" role="region" aria-label={title}>
      <IndexPatternTableWithRouter
        canSave={canSave}
        setShowCreateDialog={setShowCreateDialog}
        title={title}
      />
      {showCreateDialog && (
        <IndexPatternEditor
          onSave={(indexPattern) => {
            history.push(`patterns/${indexPattern.id}`);
          }}
          onCancel={() => setShowCreateDialog(false)}
          defaultTypeIsRollup={isRollup}
        />
      )}
    </div>
  );
};

export const IndexPatternTableContainerRouter = withRouter(IndexPatternTableContainer);
