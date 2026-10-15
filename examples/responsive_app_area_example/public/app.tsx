/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiAccordion, EuiButtonGroup, EuiPageTemplate, EuiSpacer, EuiText } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { CssTrack } from './css_track';
import { Step } from './demo';
import { JsTrack } from './js_track';
import { MODE_DESCRIPTIONS, MODE_OPTIONS, mode, setMode } from './mode';
import { WhatEuiSees, useWhatEuiSees } from './what_eui_sees';

export const App = ({ rendering }: { rendering: CoreStart['rendering'] }) => {
  const sees = useWhatEuiSees();

  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header
        pageTitle="Responsive app area"
        description={
          <>
            Pages respond to the space they get, not to the browser window. The work splits into a
            CSS track and a JS track. Switch modes to see what each one fixes.
            <EuiSpacer size="s" />
            <strong>{MODE_DESCRIPTIONS[mode]}</strong>
          </>
        }
        rightSideItems={[
          <EuiButtonGroup
            legend="EUI breakpoints follow"
            options={MODE_OPTIONS}
            idSelected={mode}
            onChange={setMode}
          />,
        ]}
      />

      <EuiPageTemplate.Section>
        <Step
          title="What EUI sees"
          description="The breakpoint CSS and JS resolve against right now. Narrow the app area with the sidebar and watch the badges move."
        >
          <WhatEuiSees sees={sees} />
        </Step>

        <CssTrack sees={sees} />

        <JsTrack sees={sees} rendering={rendering} />

        <EuiAccordion id="notShownHere" buttonContent="Not shown here" paddingSize="m">
          <EuiText size="s">
            <ul>
              <li>
                <strong>Breakpoints shift with the sidebar closed too.</strong> The app area is
                always narrower than the window by the nav width, so pages can drop a breakpoint
                with no sidebar at all.
              </li>
              <li>
                <strong>Chrome slots.</strong> Content the chrome root renders into the app area
                (the top and bottom bars) follows the app area in CSS but the window in JS, until
                that root opts in.
              </li>
              <li>
                <strong>First render.</strong> JS breakpoints measure synchronously on mount, which
                forces a layout per root.
              </li>
              <li>
                <strong>Tests.</strong> jsdom has no <code>ResizeObserver</code> and no container
                queries, so only browser tests cover the real behavior.
              </li>
              <li>
                <strong>Perf.</strong> Container queries add a style pass per layout. Dragging the
                sidebar on a heavy dashboard is the case to trace.
              </li>
            </ul>
          </EuiText>
        </EuiAccordion>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
