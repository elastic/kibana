/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable react/no-danger */

import React, { FC } from 'react';

interface Props {
  darkMode: boolean;
  stylesheetPaths: string[];
}

export const Styles: FC<Props> = ({ darkMode, stylesheetPaths }) => {
  return (
    <>
      <InlineStyles darkMode={darkMode} />
      {stylesheetPaths.map((path) => (
        <link key={path} rel="stylesheet" type="text/css" href={path} />
      ))}
    </>
  );
};

const InlineStyles: FC<{ darkMode: boolean }> = ({ darkMode }) => {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `

          *, *:before, *:after {
            box-sizing: border-box;
          }

          html, body, div, span, svg {
            margin: 0;
            padding: 0;
            border: none;
            vertical-align: baseline;
          }

          body, html {
            width: 100%;
            height: 100%;
            margin: 0;
            display: block;
          }

          html {
            background-color: ${darkMode ? '#141519' : '#F8FAFD'}
          }

          .kbnWelcomeView {
            line-height: 1.5;
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

          .kbnWelcomeTitle {
            color: #000;
            font-size: 20px;
            font-family: sans-serif;
            margin: 16px 0;
            animation: fadeIn 1s ease-in-out;
            animation-fill-mode: forwards;
            opacity: 0;
            animation-delay: 1.0s;
          }

          .kbnWelcomeText {
            display: block;
            font-size: 14px;
            font-family: sans-serif;
            line-height: 40px !important;
            height: 40px !important;
            color: #98a2b3;
            color: ${darkMode ? '#98A2B3' : '#69707D'};
          }

          .kbnLoaderWrap {
            text-align: center;
            line-height: 1;
            text-align: center;
            font-family: sans-serif;
            letter-spacing: -.005em;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            font-kerning: normal;
            font-weight: 400;
          }

          .kbnLoaderWrap svg {
            width: 64px;
            height: 64px;
            margin: auto;
            line-height: 1;
          }

          .kbnLoader path {
            stroke: white;
          }

          .kbnProgress {
            display: inline-block;
            position: relative;
            width: 32px;
            height: 4px;
            overflow: hidden;
            background-color: ${darkMode ? '#25262E' : '#F5F7FA'};
            line-height: 1;
          }

          .kbnProgress:before {
            position: absolute;
            content: '';
            height: 4px;
            width: 100%;
            top: 0;
            bottom: 0;
            left: 0;
            transform: scaleX(0) translateX(0%);
            animation: kbnProgress 1s cubic-bezier(.694, .0482, .335, 1) infinite;
            background-color: ${darkMode ? '#1BA9F5' : '#006DE4'};
          }

          @keyframes kbnProgress {
            0% {
              transform: scaleX(1) translateX(-100%);
            }

            100% {
              transform: scaleX(1) translateX(100%);
            }
          }
        `,
      }}
    />
  );
};
