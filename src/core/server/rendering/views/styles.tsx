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
          }

          .kibanaWelcomeView {
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
            margin: 10px;
            background-repeat: no-repeat;
            background-size: contain;
            /* SVG optimized according to http://codepen.io/tigt/post/optimizing-svgs-in-data-uris */
            background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj4KICA8ZyBmaWxsPSJub25lIj4KICAgIDxwYXRoIGZpbGw9IiNGREQwMDkiIGQ9Ik0xMS45MzM4MTcxLDEzLjE1MjI3NjEgTDE5LjI4NzIzNTMsMTYuNTA4MDk3MiBMMjYuNzA2NTY2NCwxMC4wMDA1MTQ3IEMyNi44MTM5NTkyLDkuNDYzODQ0OTUgMjYuODY2Mzc3LDguOTI4NTk3MjUgMjYuODY2Mzc3LDguMzY4NDY0MjIgQzI2Ljg2NjM3NywzLjc4OTg0OTU0IDIzLjE0NTk4NjQsMC4wNjQ3MzAyNzUyIDE4LjU3MTk5NDEsMC4wNjQ3MzAyNzUyIEMxNS44MzU3NTI2LDAuMDY0NzMwMjc1MiAxMy4yODM2MTI5LDEuNDEzMzcyNDggMTEuNzMyMzg0NywzLjY3NDgwODI2IEwxMC40OTgzNjI4LDEwLjA4Mzk4NzIgTDExLjkzMzgxNzEsMTMuMTUyMjc2MSBaIi8+CiAgICA8cGF0aCBmaWxsPSIjMjNCQUIxIiBkPSJNNC4zMjIxNDUwMSwyMC45NDczMzk5IEM0LjIxNDc1MjI5LDIxLjQ4NDE1MTggNC4xNTk2MzU0LDIyLjA0MTAxNDIgNC4xNTk2MzU0LDIyLjYwNDQxNzkgQzQuMTU5NjM1NCwyNy4xOTQ4MzUzIDcuODkwOTY0MTksMzAuOTMwMDUwOSAxMi40Nzc0NTcyLDMwLjkzMDA1MDkgQzE1LjIzNjE0MzIsMzAuOTMwMDUwOSAxNy44MDA3ODM3LDI5LjU2ODc1MjggMTkuMzQ5NTk2OSwyNy4yODQxMzgxIEwyMC41NzQzODUzLDIwLjg5NjU3MzkgTDE4LjkzOTkxMzYsMTcuNzY5ODM5OSBMMTEuNTU3Mzc0NCwxNC40MDE1MDUgTDQuMzIyMTQ1MDEsMjAuOTQ3MzM5OSBaIi8+CiAgICA8cGF0aCBmaWxsPSIjRUU1MDk3IiBkPSJNNC4yNzU1MzcxNCw4LjIwODQ3Mjk0IEw5LjMxNTAzOTk1LDkuMzk5NTU1NSBMMTAuNDE5MDgyNiwzLjY2Mzk4NjcgQzkuNzMwNDA1NDUsMy4xMzcxMjg5IDguODgwMzU1MTMsMi44NDg3NDM1OCA4LjAwNjAxMzYxLDIuODQ4NzQzNTggQzUuODE1OTY5MjIsMi44NDg3NDM1OCA0LjAzNDg5NzksNC42MzI1MjMzOSA0LjAzNDg5NzksNi44MjQ4NDkwOCBDNC4wMzQ4OTc5LDcuMzA5MDQ2MzMgNC4xMTU3MjY1NSw3Ljc3MzMzNTMyIDQuMjc1NTM3MTQsOC4yMDg0NzI5NCIvPgogICAgPHBhdGggZmlsbD0iIzE3QTdFMCIgZD0iTTMuODM4MDY4MDcsOS40MDk5NjQ2OCBDMS41ODY1MTQzNSwxMC4xNTY4MDg3IDAuMDIxMDgwNzkzMSwxMi4zMTcyODEyIDAuMDIxMDgwNzkzMSwxNC42OTM3NTgzIEMwLjAyMTA4MDc5MzEsMTcuMDA3ODA4NyAxLjQ1MDcxMDg2LDE5LjA3NDE0MzYgMy41OTY1NzY1LDE5Ljg5MTgwNDEgTDEwLjY2Njg4MTMsMTMuNDk0NDI4IEw5LjM2ODc5MzEzLDEwLjcxNzc5NSBMMy44MzgwNjgwNyw5LjQwOTk2NDY4IFoiLz4KICAgIDxwYXRoIGZpbGw9IiM5MkM3M0QiIGQ9Ik0yMC42NDIxNzM0LDI3LjI4Mzg1MzcgQzIxLjMzMzQwNzUsMjcuODE1Njg4NSAyMi4xNzkzMzgzLDI4LjEwNTc4MDMgMjMuMDQyODgzNywyOC4xMDU3ODAzIEMyNS4yMzI3ODYsMjguMTA1NzgwMyAyNy4wMTM4NTc0LDI2LjMyMjg1MzcgMjcuMDEzODU3NCwyNC4xMzA1MjggQzI3LjAxMzg1NzQsMjMuNjQ3MDQxNyAyNi45MzMxNzA4LDIzLjE4Mjc1MjggMjYuNzczMjE4MSwyMi43NDc3NTczIEwyMS43Mzc5NzY5LDIxLjU2ODE5MzEgTDIwLjY0MjE3MzQsMjcuMjgzODUzNyBaIi8+CiAgICA8cGF0aCBmaWxsPSIjMDY3OEEwIiBkPSJNMjEuNjY2NzIyNywyMC4yNDY5NTMyIEwyNy4yMDk5NDg1LDIxLjU0NDY4NzIgQzI5LjQ2MjM1NDUsMjAuNzk5NTQ5NSAzMS4wMjc3ODgxLDE4LjYzODIyMzkgMzEuMDI3Nzg4MSwxNi4yNjA4OTM2IEMzMS4wMjc3ODgxLDEzLjk1MTEwOTIgMjkuNTk0NzQ4NywxMS44ODcxOTE3IDI3LjQ0NDc2MzUsMTEuMDcxOTQ4NiBMMjAuMTk0NjE4NSwxNy40MzAzNjE1IEwyMS42NjY3MjI3LDIwLjI0Njk1MzIgWiIvPgogIDwvZz4KPC9zdmc+Cg==")
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
          }

          .kibanaWelcomeLogoCircle {
            margin: 10px;
            width: 120px;
            height: 120px;
            padding: 20px;
            transform: scale(1);
            animation: pulse 1s infinite;
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
          @keyframes pulse {
            0% {
              transform: scale(0.9);
            }

            70% {
              transform: scale(1);
            }

            100% {
              transform: scale(0.9);
            }
          }
        `,
      }}
    />
  );
};
