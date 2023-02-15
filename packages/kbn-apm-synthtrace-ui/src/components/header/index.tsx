import {
  EuiHeader,
  EuiHeaderSectionItem,
  EuiHeaderLogo,
  EuiHeaderLinks,
  EuiHeaderLink,
} from '@elastic/eui';
import React from 'react';

export function Header() {
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
            On-Week Issue
          </EuiHeaderLink>

          <EuiHeaderLink isActive href="https://eui.elastic.co" target="_blank">
            EUI
          </EuiHeaderLink>

          <EuiHeaderLink
            iconType="help"
            target="_blank"
            href="https://github.com/elastic/kibana/tree/main/packages/kbn-apm-synthtrace"
          >
            Help (Synthtrace)
          </EuiHeaderLink>
        </EuiHeaderLinks>
      </EuiHeaderSectionItem>
    </EuiHeader>
  );
}
