/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Since we're not using `RedirectAppLinks`, we need to use `navigateToUrl` when
// handling the click of the Open in Dev Tools link. We want to have both an
// `onClick` handler and an `href` attribute so it will work on click without a
// page reload, and on right-click to open in new tab.
/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';
import { compressToEncodedURIComponent } from 'lz-string';
import React, { MouseEvent, useCallback } from 'react';
import { CodeEditor, useKibana } from '../../../../../../kibana_react/public';

interface RequestCodeViewerProps {
  indexPattern?: string;
  json: string;
}

const copyToClipboardLabel = i18n.translate('inspector.requests.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

const openInDevToolsLabel = i18n.translate('inspector.requests.openInDevToolsLabel', {
  defaultMessage: 'Open in Dev Tools',
});

/**
 * @internal
 */
export const RequestCodeViewer = ({ indexPattern, json }: RequestCodeViewerProps) => {
  const { services } = useKibana();
  const prepend = services.http?.basePath?.prepend;
  const navigateToUrl = services.application?.navigateToUrl;
  const canShowDevTools = services.application?.capabilities?.dev_tools.show;
  const devToolsDataUri = compressToEncodedURIComponent(`GET ${indexPattern}/_search\n${json}`);
  const devToolsUrl = `/app/dev_tools#/console?load_from=data:text/plain,${devToolsDataUri}`;
  const shouldShowDevToolsLink = !!(indexPattern && canShowDevTools);

  const handleDevToolsLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (navigateToUrl && prepend) {
        navigateToUrl(prepend(devToolsUrl));
      }
    },
    [devToolsUrl, navigateToUrl, prepend]
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      wrap={false}
      responsive={false}
      className="insRequestCodeViewer"
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <div className="eui-textRight">
          <EuiCopy textToCopy={json}>
            {(copy) => (
              <EuiButtonEmpty
                size="xs"
                flush="right"
                iconType="copyClipboard"
                onClick={copy}
                data-test-subj="inspectorRequestCopyClipboardButton"
              >
                {copyToClipboardLabel}
              </EuiButtonEmpty>
            )}
          </EuiCopy>
          {shouldShowDevToolsLink && (
            <EuiButtonEmpty
              size="xs"
              flush="right"
              iconType="wrench"
              href={prepend && prepend(devToolsUrl)}
              onClick={handleDevToolsLinkClick}
              data-test-subj="inspectorRequestOpenInDevToolsButton"
            >
              {openInDevToolsLabel}
            </EuiButtonEmpty>
          )}
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <CodeEditor
          languageId={XJsonLang.ID}
          value={json}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            folding: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
