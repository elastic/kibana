/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useContext } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutProps,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiPortal,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { HelpCenterContext } from './help_center_header_nav_button';

export const HelpCenterFlyout = (
  props: Partial<EuiFlyoutProps> & { showPlainSpinner: boolean }
) => {
  const { newsFetchResult, setFlyoutVisible } = useContext(HelpCenterContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), [setFlyoutVisible]);
  const { showPlainSpinner, ...rest } = props;
  return (
    <EuiPortal>
      <EuiFlyout
        {...rest}
        onClose={closeFlyout}
        size="s"
        aria-labelledby="flyoutSmallTitle"
        className="kbnNews__flyout"
        data-test-subj="HelpCenterFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutSmallTitle">
              <FormattedMessage
                id="HelpCenter.flyoutList.whatsNewTitle"
                defaultMessage="What's new at Elastic"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody className={'kbnNews__flyoutAlerts'}>here</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                <FormattedMessage
                  id="HelpCenter.flyoutList.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {newsFetchResult ? (
                <EuiText color="subdued" size="s">
                  <p>
                    <FormattedMessage
                      id="HelpCenter.flyoutList.versionTextLabel"
                      defaultMessage="{version}"
                      values={{ version: `Version ${newsFetchResult.kibanaVersion}` }}
                    />
                  </p>
                </EuiText>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
