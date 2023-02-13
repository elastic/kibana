import React from 'react';
import {
  EuiHeader,
  EuiHeaderSectionItem,
  EuiHeaderLogo,
  EuiHeaderLinks,
  EuiHeaderLink,
} from '@elastic/eui';

export default () => {
  return (
    <EuiHeader>
      <EuiHeaderSectionItem border="right">
        <EuiHeaderLogo>Elastic</EuiHeaderLogo>
      </EuiHeaderSectionItem>

      <EuiHeaderSectionItem>
        <EuiHeaderLinks aria-label="App navigation links example">
          <EuiHeaderLink
            isActive
            href="https://github.com/elastic/app-obs-dev/issues/7"
            target="_blank"
          >
            Docs
          </EuiHeaderLink>

          <EuiHeaderLink
            iconType="help"
            target="_blank"
            href="https://github.com/elastic/kibana/tree/main/packages/kbn-apm-synthtrace"
          >
            Help
          </EuiHeaderLink>
        </EuiHeaderLinks>
      </EuiHeaderSectionItem>
    </EuiHeader>
  );
};
