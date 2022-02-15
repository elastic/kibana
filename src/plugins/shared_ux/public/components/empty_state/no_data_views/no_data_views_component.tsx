/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import { EuiPageContent } from '@elastic/eui';
import { DocumentationLink } from './documentation_link';
/** This is an exception to include a sass file.
 * Current styling requires `breakpoint` mixin, which has not been moved to emotion yet
 */
import './no_data_views_component.scss';

const Illustration = lazy(() => import('../assets/data_view_illustration'));

interface NoDataViewsComponentProps {
  canCreateNewDataView: boolean;
  onClick?: () => void;
  dataViewsDocLink?: string;
}

const createDataViewText = i18n.translate('sharedUX.noDataViewsPage.addDataViewText', {
  defaultMessage: 'Create Data View',
});

export const NoDataViewsComponent = (props: NoDataViewsComponentProps) => {
  const { onClick, canCreateNewDataView, dataViewsDocLink } = props;
  const { euiTheme } = useEuiTheme();
  const { size } = euiTheme;
  const maxWidth = Number.parseInt(size.xxl.slice(0, -2), 10) * 19 + 'px';

  const button = (
    <EuiButton
      onClick={onClick}
      iconType="plusInCircle"
      fill={true}
      data-test-subj="createDataViewButtonFlyout"
    >
      {createDataViewText}
    </EuiButton>
  );
  return (
    <EuiPageContent
      data-test-subj="noDataViewsPrompt"
      css={css`
        max-width: ${maxWidth} !important;
      `}
      grow={false}
      verticalPosition="center"
      horizontalPosition="center"
      color="subdued"
    >
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem grow={1} className="noDataViews__illustration">
          <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
            <Illustration />
          </Suspense>
        </EuiFlexItem>
        <EuiFlexItem grow={2} className="noDataViews__text">
          <EuiText grow={false}>
            <h2>
              <FormattedMessage
                id="sharedUX.noDataViews.youHaveData"
                defaultMessage="You have data in Elasticsearch."
              />
              <br />
              <FormattedMessage
                id="sharedUX.noDataViews.nowCreate"
                defaultMessage="Now, create a data view."
              />
            </h2>
            <p>
              <FormattedMessage
                id="sharedUX.noDataViews.dataViewExplanation"
                defaultMessage="Kibana requires a data view to identify which data streams, indices, and index aliases you want to explore. A
                data view can point to a specific index, for example, your log data from
                yesterday, or all indices that contain your log data."
              />
            </p>
            <div>{canCreateNewDataView && button}</div>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {dataViewsDocLink && (
        <>
          <EuiSpacer size="xxl" />
          <DocumentationLink documentationUrl={dataViewsDocLink} />
        </>
      )}
    </EuiPageContent>
  );
};
