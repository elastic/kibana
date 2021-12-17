/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// We want to allow both right-clicking to open in a new tab and clicking through
// the "Open in Console" link. We could use `RedirectAppLinks` at the top level
// but that inserts a div which messes up the layout of the inspector.
/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';
import { compressToEncodedURIComponent } from 'lz-string';
import React, { useCallback } from 'react';
import { CodeEditor, useKibana } from '../../../../../../kibana_react/public';
import { InspectorPluginStartDeps } from '../../../../plugin';

interface RequestCodeViewerProps {
  indexPattern?: string;
  json: string;
}

const copyToClipboardLabel = i18n.translate('inspector.requests.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

const openInConsoleLabel = i18n.translate('inspector.requests.openInConsoleLabel', {
  defaultMessage: 'Open in Console',
});

/**
 * @internal
 */
export const RequestCodeViewer = ({ indexPattern, json }: RequestCodeViewerProps) => {
  const { services } = useKibana<InspectorPluginStartDeps>();

  const navigateToUrl = services.application?.navigateToUrl;
  const devToolsDataUri = compressToEncodedURIComponent(`GET ${indexPattern}/_search\n${json}`);
  const consoleHref = services.share.url.locators
    .get('CONSOLE_APP_LOCATOR')
    ?.useUrl({ loadFrom: `data:text/plain,${devToolsDataUri}` });
  // Check if both the Dev Tools UI and the Console UI are enabled.
  const canShowDevTools =
    services.application?.capabilities?.dev_tools.show && consoleHref !== undefined;
  const shouldShowDevToolsLink = !!(indexPattern && canShowDevTools);
  const handleDevToolsLinkClick = useCallback(
    () => consoleHref && navigateToUrl && navigateToUrl(consoleHref),
    [consoleHref, navigateToUrl]
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
              href={consoleHref}
              onClick={handleDevToolsLinkClick}
              data-test-subj="inspectorRequestOpenInConsoleButton"
            >
              {openInConsoleLabel}
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
