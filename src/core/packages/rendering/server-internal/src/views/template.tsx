/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent, createElement } from 'react';
import { EUI_STYLES_GLOBAL, EUI_STYLES_UTILS } from '@kbn/core-base-common';
import { i18n } from '@kbn/i18n';
import { RenderingMetadata } from '../types';
import { Fonts } from './fonts';
import { Logo } from './logo';
import { Styles } from './styles';

interface Props {
  metadata: RenderingMetadata;
}

export const Template: FunctionComponent<Props> = ({
  metadata: {
    uiPublicUrl,
    locale,
    darkMode,
    stylesheetPaths,
    scriptPaths,
    injectedMetadata,
    bootstrapScriptUrl,
    hardenPrototypes,
    strictCsp,
    customBranding,
  },
}) => {
  const title = customBranding.pageTitle ?? 'Elastic';
  const favIcon = customBranding.faviconSVG ?? `${uiPublicUrl}/favicons/favicon.svg`;
  const favIconPng = customBranding.faviconPNG ?? `${uiPublicUrl}/favicons/favicon.png`;
  const logo = customBranding.logo ? (
    <img src={customBranding.logo} width="64" height="64" alt="logo" />
  ) : (
    <Logo />
  );
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
        <meta name="viewport" content="width=device-width" />
        <title>{title}</title>
        <Fonts url={uiPublicUrl} />
        {/* The alternate icon is a fallback for Safari which does not yet support SVG favicons */}
        <link rel="alternate icon" type="image/png" href={favIconPng} />
        <link rel="icon" type="image/svg+xml" href={favIcon} />
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="light dark" />
        {/* Inject EUI reset and global styles before all other component styles */}
        <meta name={EUI_STYLES_GLOBAL} />
        <meta name="emotion" />
        <Styles
          darkMode={darkMode}
          themeName={injectedMetadata.theme.name}
          stylesheetPaths={stylesheetPaths}
        />
        {scriptPaths.map((path) => (
          <script key={path} src={path} />
        ))}
        {/* Inject stylesheets into the <head> before scripts so that KP plugins with bundled styles will override them */}
        <meta name="add-styles-here" />
        <meta name="add-scripts-here" />
        {/* Inject EUI CSS utilties after all other styles for CSS specificity */}
        <meta name={EUI_STYLES_UTILS} />
      </head>
      <body>
        {createElement('kbn-csp', {
          data: JSON.stringify({ strictCsp }),
        })}
        {createElement('kbn-prototype-hardening', {
          data: JSON.stringify({ hardenPrototypes }),
        })}
        {createElement('kbn-injected-metadata', { data: JSON.stringify(injectedMetadata) })}
        <div
          className="kbnWelcomeView"
          id="kbn_loading_message"
          style={{ display: 'none' }}
          data-test-subj="kbnLoadingMessage"
        >
          <div className="kbnLoaderWrap">
            {logo}
            <div
              className="kbnWelcomeText"
              data-error-message-title={i18n.translate('core.ui.welcomeErrorMessageTitle', {
                defaultMessage: 'Elastic did not load properly',
              })}
              data-error-message-text={i18n.translate('core.ui.welcomeErrorMessageText', {
                defaultMessage:
                  'Please reload this page. If the issue persists, check the browser console and server logs.',
              })}
              data-error-message-reload={i18n.translate('core.ui.welcomeErrorReloadButton', {
                defaultMessage: 'Reload',
              })}
            >
              {i18n.translate('core.ui.welcomeMessage', {
                defaultMessage: 'Loading Elastic',
              })}
            </div>
            <div className="kbnProgress" />
          </div>
        </div>

        <div className="kbnWelcomeView" id="kbn_legacy_browser_error" style={{ display: 'none' }}>
          {logo}

          <h2 className="kbnWelcomeTitle">
            {i18n.translate('core.ui.legacyBrowserTitle', {
              defaultMessage: 'Please upgrade your browser',
            })}
          </h2>
          <div className="kbnWelcomeText">
            {i18n.translate('core.ui.legacyBrowserMessage', {
              defaultMessage:
                'This Elastic installation has strict security requirements enabled that your current browser does not meet.',
            })}
          </div>
        </div>

        <script>
          {`// kbnUnsafeInlineTest do not remove this comment:
            //   it is used for filtering out expected CSP failures, and must be the first piece of content in this script block.
            // Since this is an unsafe inline script, this code will not run
            // in browsers that support content security policy(CSP). This is
            // intentional as we check for the existence of __kbnCspNotEnforced__ in
            // bootstrap.
            window.__kbnCspNotEnforced__ = true;
          `}
        </script>
        <script src={bootstrapScriptUrl} />
      </body>
    </html>
  );
};
