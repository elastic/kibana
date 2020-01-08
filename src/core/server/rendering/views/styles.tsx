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

/* eslint-disable react/no-danger */

import React, { FunctionComponent } from 'react';

import { RenderingMetadata } from '../types';

interface Props {
  darkMode: RenderingMetadata['darkMode'];
}

export const Styles: FunctionComponent<Props> = ({ darkMode }) => {
  const themeBackground = darkMode ? '#25262e' : '#f5f7fa';

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          * {
            box-sizing: border-box;
          }

          body, html {
            width: 100%;
            height: 100%;
            margin: 0;
            background-color: ${themeBackground};
          }

          .kibanaWelcomeView {
            background-color: ${themeBackground};
            height: 100%;
            display: -webkit-box;
            display: -webkit-flex;
            display: -ms-flexbox;
            display: flex;
            -webkit-box-flex: 1;
            -webkit-flex: 1 0 auto;
                -ms-flex: 1 0 auto;
                    flex: 1 0 auto;
            -webkit-box-orient: vertical;
            -webkit-box-direction: normal;
            -webkit-flex-direction: column;
                -ms-flex-direction: column;
                    flex-direction: column;
            -webkit-box-align: center;
            -webkit-align-items: center;
                -ms-flex-align: center;
                    align-items: center;
            -webkit-box-pack: center;
            -webkit-justify-content: center;
                -ms-flex-pack: center;
                    justify-content: center;
          }

          .kibanaWelcomeLogo {
            width: 60px;
            height: 60px;
            margin: 10px 0 10px 20px;
            background-repeat: no-repeat;
            background-size: contain;
            /* SVG optimized according to http://codepen.io/tigt/post/optimizing-svgs-in-data-uris */
            background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzOSIgdmlld0JveD0iMCAwIDMwIDM5Ij4gIDxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+ICAgIDxwb2x5Z29uIGZpbGw9IiNGMDRFOTgiIHBvaW50cz0iMCAwIDAgMzQuNTQ3IDI5LjkyMiAuMDIiLz4gICAgPHBhdGggZmlsbD0iIzM0Mzc0MSIgZD0iTTAsMTQuNCBMMCwzNC41NDY4IEwxNC4yODcyLDE4LjA2MTIgQzEwLjA0MTYsMTUuNzM4IDUuMTgwNCwxNC40IDAsMTQuNCIvPiAgICA8cGF0aCBmaWxsPSIjMDBCRkIzIiBkPSJNMTcuMzc0MiwxOS45OTY4IEwyLjcyMSwzNi45MDQ4IEwxLjQzMzQsMzguMzg5MiBMMjkuMjYzOCwzOC4zODkyIEMyNy43NjE0LDMwLjgzODggMjMuNDA0MiwyNC4zMjY0IDE3LjM3NDIsMTkuOTk2OCIvPiAgPC9nPjwvc3ZnPg==');
          }

          .kibanaWelcomeTitle {
            color: #000;
            font-size: 20px;
            font-family: sans-serif;
            margin-top: 20px;
            animation: fadeIn 1s ease-in-out;
            animation-fill-mode: forwards;
            opacity: 0;
            animation-delay: 1.0s;
          }

          .kibanaWelcomeText {
            font-size: 14px;
            font-family: sans-serif;
            color: #98a2b3;
            animation: fadeIn 1s ease-in-out;
            animation-fill-mode: forwards;
            opacity: 0;
            animation-delay: 1.0s;
          }

          .kibanaLoaderWrap {
            height: 128px;
            width: 128px;
            position: relative;
            margin-top: 40px;
          }

          .kibanaLoaderWrap + * {
            margin-top: 24px;
          }

          .kibanaLoader {
            height: 128px;
            width: 128px;
            margin: 0 auto;
            position: relative;
            border: 2px solid transparent;
            border-top: 2px solid #017d73;
            border-radius: 100%;
            display: block;
            opacity: 0;
            animation: rotation .75s .5s infinite linear, fadeIn 1s .5s ease-in-out forwards;
          }

          .kibanaWelcomeLogoCircle {
            position: absolute;
            left: 4px;
            top: 4px;
            width: 120px;
            height: 120px;
            padding: 20px;
            background-color: #fff;
            border-radius: 50%;
            animation: bounceIn .5s ease-in-out;
          }

          @keyframes rotation {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(359deg);
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes bounceIn {
            0% {
              opacity: 0;
              transform: scale(.1);
            }
            80% {
              opacity: .5;
              transform: scale(1.2);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `,
      }}
    />
  );
};
