/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { compressToEncodedURIComponent } from 'lz-string';

import {
  EuiFlyout,
  EuiFlyoutProps,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiCodeBlock,
  EuiCopy,
} from '@elastic/eui';
import type { UrlService } from '@kbn/share-plugin/common/url_service';
import { ApplicationStart, APP_WRAPPER_CLASS } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/kibana-react-plugin/public';

type FlyoutProps = Omit<EuiFlyoutProps, 'onClose'>;
interface ViewApiRequestFlyoutProps {
  title: string;
  description: string;
  request: string;
  closeFlyout: () => void;
  flyoutProps?: FlyoutProps;
  application?: ApplicationStart;
  urlService?: UrlService;
}

export const ApiRequestFlyout: React.FunctionComponent<ViewApiRequestFlyoutProps> = ({
  title,
  description,
  request,
  closeFlyout,
  flyoutProps,
  urlService,
  application,
}) => {
  const getUrlParams = undefined;
  const canShowDevtools = !!application?.capabilities?.dev_tools?.show;
  const devToolsDataUri = compressToEncodedURIComponent(request);

  // Generate a console preview link if we have a valid locator
  const consolePreviewLink = urlService?.locators.get('CONSOLE_APP_LOCATOR')?.useUrl(
    {
      loadFrom: `data:text/plain,${devToolsDataUri}`,
    },
    getUrlParams,
    [request]
  );

  // Check if both the Dev Tools UI and the Console UI are enabled.
  const shouldShowDevToolsLink = canShowDevtools && consolePreviewLink !== undefined;

  return (
    <EuiFlyout onClose={closeFlyout} data-test-subj="apiRequestFlyout" {...flyoutProps}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 data-test-subj="apiRequestFlyoutTitle">{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          <p data-test-subj="apiRequestFlyoutDescription">{description}</p>
        </EuiText>
        <EuiSpacer />

        <EuiSpacer size="s" />
        <div className="eui-textRight">
          <EuiCopy textToCopy={request}>
            {(copy) => (
              <EuiButtonEmpty
                size="xs"
                flush="right"
                iconType="copyClipboard"
                onClick={copy}
                data-test-subj="apiRequestFlyoutCopyClipboardButton"
              >
                <FormattedMessage
                  id="esUi.viewApiRequest.copyToClipboardButton"
                  defaultMessage="Copy to clipboard"
                />
              </EuiButtonEmpty>
            )}
          </EuiCopy>
          {shouldShowDevToolsLink && (
            <EuiButtonEmpty
              size="xs"
              flush="right"
              iconType="wrench"
              href={consolePreviewLink}
              data-test-subj="apiRequestFlyoutOpenInConsoleButton"
            >
              <FormattedMessage
                id="esUi.viewApiRequest.openInConsoleButton"
                defaultMessage="Open in Console"
              />
            </EuiButtonEmpty>
          )}
        </div>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" data-test-subj="apiRequestFlyoutBody">
          {request}
        </EuiCodeBlock>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty
          iconType="cross"
          onClick={closeFlyout}
          flush="left"
          data-test-subj="apiRequestFlyoutClose"
        >
          <FormattedMessage id="esUi.viewApiRequest.closeButtonLabel" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const ViewApiRequestFlyout = (props: ViewApiRequestFlyoutProps) => {
  if (props.application) {
    return (
      <RedirectAppLinks
        application={props.application}
        className={APP_WRAPPER_CLASS}
        data-test-subj="apiRequestFlyoutRedirectWrapper"
      >
        <ApiRequestFlyout {...props} />
      </RedirectAppLinks>
    );
  }

  return <ApiRequestFlyout {...props} />;
};
