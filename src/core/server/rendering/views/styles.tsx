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

            @keyframes scaleElastic {
              0% {
                  transform: scale3d(0, 0, -0.7);
                  opacity: 0;
              }
              40% {
                  transform: scale3d(1, 1, 2);
                  opacity: 1;
              }
              50%{
                  transform: scale3d(.95, .95, 2);
              }
              70% {
                  transform: scale3d(0.90, 0.90, -2.5);
              }
              100% {
                  transform: scale3d(1, 1, 2);
              }
          }
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
            font-size: 16px;
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
            text-align: center;
          }

          .kibanaLogoElastic {
            width: 128px;
            height: 128px;
            margin-bottom: 16px;
          }

          .kibanaLogoElastic path {
            stroke: white;
            animation-name: scaleElastic;
            animation-fill-mode: forwards;
            animation-direction: alternate;
            transform-style: preserve-3d;
            animation-duration: 0.95s;
            animation-timing-function: cubic-bezier(0, 0.63, 0.49, 1);
            animation-iteration-count: infinite;
            transform-origin: 50% 50%;
          }

          .kibanaLogoElastic path:nth-of-type(1) {
            fill: #EE5097;
            animation-delay: 0s;
          }


          .kibanaLogoElastic path:nth-of-type(2) {
            fill: #17A7E0;
            animation-delay: 0.035s;
          }


          .kibanaLogoElastic path:nth-of-type(3) {
            fill: #23BAB1;
            animation-delay: 0.125s;
          }


          .kibanaLogoElastic path:nth-of-type(4) {
            fill: #92C73D;
            animation-delay: 0.155s;
          }


          .kibanaLogoElastic path:nth-of-type(5) {
            fill: #0678A0;
            animation-delay: 0.075s;
          }


          .kibanaLogoElastic path:nth-of-type(6) {
            fill: #FDD009;
            animation-delay: 0.06s;
          };

        `,
      }}
    />
  );
};
