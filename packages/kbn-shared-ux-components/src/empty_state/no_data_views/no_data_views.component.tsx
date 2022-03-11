/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiEmptyPrompt, EuiEmptyPromptProps } from '@elastic/eui';

import { DataViewIllustration } from '../assets';
import { DocumentationLink } from './documentation_link';

export interface Props {
  canCreateNewDataView: boolean;
  onClickCreate?: () => void;
  dataViewsDocLink?: string;
  emptyPromptColor?: EuiEmptyPromptProps['color'];
}

const createDataViewText = i18n.translate('sharedUXComponents.noDataViewsPage.addDataViewText', {
  defaultMessage: 'Create Data View',
});

// Using raw value because it is content dependent
const MAX_WIDTH = 830;

/**
 * A presentational component that is shown in cases when there are no data views created yet.
 */
export const NoDataViews = ({
  onClickCreate,
  canCreateNewDataView,
  dataViewsDocLink,
  emptyPromptColor = 'plain',
}: Props) => {
  const createNewButton = canCreateNewDataView && (
    <EuiButton
      onClick={onClickCreate}
      iconType="plusInCircle"
      fill={true}
      data-test-subj="createDataViewButtonFlyout"
    >
      {createDataViewText}
    </EuiButton>
  );

  return (
    <EuiEmptyPrompt
      data-test-subj="noDataViewsPrompt"
      layout="horizontal"
      css={css`
        max-width: ${MAX_WIDTH}px !important; // Necessary to override EuiEmptyPrompt to fit content
      `}
      color={emptyPromptColor}
      icon={<DataViewIllustration />}
      title={
        <h2>
          <FormattedMessage
            id="sharedUXComponents.noDataViews.youHaveData"
            defaultMessage="You have data in Elasticsearch."
          />
          <br />
          <FormattedMessage
            id="sharedUXComponents.noDataViews.nowCreate"
            defaultMessage="Now, create a data view."
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="sharedUXComponents.noDataViews.dataViewExplanation"
            defaultMessage="Kibana requires a data view to identify which data streams,
            indices, and index aliases you want to explore. A data view can point to a
            specific index, for example, your log data from yesterday, or all indices
            that contain your log data."
          />
        </p>
      }
      actions={createNewButton}
      footer={dataViewsDocLink && <DocumentationLink href={dataViewsDocLink} />}
    />
  );
};
