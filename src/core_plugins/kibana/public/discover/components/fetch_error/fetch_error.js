import 'ngreact';
import React, { Fragment } from 'react';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';

import './fetch_error.less';

const DiscoverFetchError = ({ fetchError }) => {
  if (!fetchError) {
    return null;
  }

  let body;

  if (fetchError.lang === 'painless') {
    const managementUrl = chrome.getNavLinkById('kibana:management').url;
    const url = `${managementUrl}/kibana/indices`;

    body = (
      <p>
         You can address this error by editing the &lsquo;{fetchError.script}&rsquo; field
         in <a href={url}>Management &gt; Index Patterns</a>,
         under the &ldquo;Scripted fields&rdquo; tab.
      </p>
    );
  }

  return (
    <Fragment>
      <EuiSpacer size="xl" />

      <EuiFlexGroup justifyContent="center" data-test-subj="discoverFetchError">
        <EuiFlexItem grow={false} className="discoverFetchError">
          <EuiCallOut
            title={fetchError.message}
            color="danger"
            iconType="cross"
          >
            {body}

            <EuiCodeBlock>
              {fetchError.error}
            </EuiCodeBlock>
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />
    </Fragment>
  );
};

const app = uiModules.get('apps/discover', ['react']);

app.directive('discoverFetchError', reactDirective => reactDirective(DiscoverFetchError));
