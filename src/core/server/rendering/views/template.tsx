/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { FunctionComponent, createElement } from 'react';

import { RenderingMetadata } from '../types';
import { Fonts } from './fonts';
import { Styles } from './styles';

interface Props {
  metadata: RenderingMetadata;
}

export const Template: FunctionComponent<Props> = ({
  metadata: {
    uiPublicUrl,
    locale,
    darkMode,
    injectedMetadata,
    i18n,
    bootstrapScriptUrl,
    strictCsp,
  },
}) => {
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
        <meta name="viewport" content="width=device-width" />
        <title>Kibana</title>
        <Fonts url={uiPublicUrl} />
        {/* Favicons (generated from http://realfavicongenerator.net/) */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={`${uiPublicUrl}/favicons/apple-touch-icon.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={`${uiPublicUrl}/favicons/favicon-32x32.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={`${uiPublicUrl}/favicons/favicon-16x16.png`}
        />
        <link rel="manifest" href={`${uiPublicUrl}/favicons/manifest.json`} />
        <link
          rel="mask-icon"
          color="#e8488b"
          href={`${uiPublicUrl}/favicons/safari-pinned-tab.svg`}
        />
        <link rel="shortcut icon" href={`${uiPublicUrl}/favicons/favicon.ico`} />
        <meta name="msapplication-config" content={`${uiPublicUrl}/favicons/browserconfig.xml`} />
        <meta name="theme-color" content="#ffffff" />
        <Styles darkMode={darkMode} />
      </head>
      <body>
        {createElement('kbn-csp', {
          data: JSON.stringify({ strictCsp }),
        })}
        {createElement('kbn-injected-metadata', { data: JSON.stringify(injectedMetadata) })}
        <div
          className="kibanaWelcomeView"
          id="kbn_loading_message"
          style={{ display: 'none' }}
          data-test-subj="kbnLoadingMessage"
        >
          <div className="kibanaLoaderWrap">
            <div className="kibanaWelcomeLogoCircle">
              <svg
                className="loading-elastic"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 218 204"
              >
                <path
                  strokeWidth="3"
                  d="M52.1597 70.325l.278.7571.785.1855 19.5281 4.6155 1.5223.3597.2956-1.536 4.2782-22.2253.1754-.9111-.7369-.5638c-2.931-2.2423-6.5454-3.4677-10.2621-3.4677-9.3167 0-16.8881 7.5856-16.8881 16.9074 0 2.045.3418 4.0198 1.0245 5.8787z"
                />
                <path
                  strokeWidth="3"
                  d="M52.2177 73.0039l-.4138-.0979-.4036.1339c-9.3366 3.0969-15.8186 12.0412-15.8186 21.8984 0 9.5887 5.924 18.1537 14.8209 21.5437l.859.328.6815-.617 27.3975-24.7898.8218-.7436-.4694-1.004-5.0301-10.7594-.3073-.6575-.7063-.167-21.4316-5.0678z"
                />
                <path
                  strokeWidth="3"
                  d="M52.742 118.059l-.3674.332-.0971.486c-.4359 2.178-.6589 4.435-.6589 6.715 0 18.615 15.1291 33.762 33.7316 33.762 11.188 0 21.5908-5.522 27.8708-14.786l.174-.256.058-.303 4.746-24.752.098-.514-.242-.464-6.334-12.116-.238-.456-.468-.214-28.6075-13.0518-.8975-.4095-.7315.6618L52.742 118.059z"
                />
                <path
                  strokeWidth="3"
                  d="M115.515 143.442l-.174.908.733.564c2.937 2.26 6.536 3.496 10.217 3.496 9.316 0 16.888-7.582 16.888-16.904 0-2.042-.341-4.017-1.025-5.876l-.279-.759-.787-.184-19.511-4.571-1.521-.356-.295 1.534-4.246 22.148z"
                />
                <path
                  strokeWidth="3"
                  d="M119.629 117.152l.318.609.67.156 21.48 5.029.411.097.402-.133c9.341-3.091 15.823-12.039 15.823-21.899 0-9.5759-5.941-18.1305-14.853-21.5098l-.843-.3196-.678.5945-28.094 24.6389-.886.777.546 1.045 5.704 10.915z"
                />
                <path
                  strokeWidth="3"
                  d="M81.8849 89.6007l.2338.4999.5021.2291 28.4942 13.0033.883.403.729-.639 28.75-25.2173.382-.3351.1-.4983c.436-2.1787.648-4.3515.648-6.6185 0-18.5689-15.086-33.677-33.641-33.677-11.0992 0-21.4505 5.4716-27.74 14.6406l-.1768.2578-.0592.3071-4.7818 24.8355-.0921.4782.2064.4411 5.5624 11.8896z"
                />
              </svg>
            </div>
          </div>

          <div
            className="kibanaWelcomeText"
            data-error-message={i18n('core.ui.welcomeErrorMessage', {
              defaultMessage:
                'Kibana did not load properly. Check the server output for more information.',
            })}
          >
            {i18n('core.ui.welcomeMessage', { defaultMessage: 'Loading' })}
          </div>
        </div>

        <div
          className="kibanaWelcomeView"
          id="kbn_legacy_browser_error"
          style={{ display: 'none' }}
        >
          <div className="kibanaLoaderWrap">
            <div className="kibanaWelcomeLogoCircle">
              <div className="kibanaWelcomeLogo" />
            </div>
          </div>

          <h2 className="kibanaWelcomeTitle">
            {i18n('core.ui.legacyBrowserTitle', {
              defaultMessage: 'Please upgrade your browser',
            })}
          </h2>
          <div className="kibanaWelcomeText">
            {i18n('core.ui.legacyBrowserMessage', {
              defaultMessage:
                'This Kibana installation has strict security requirements enabled that your current browser does not meet.',
            })}
          </div>
        </div>

        <script>
          {`
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
