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

/* eslint-disable import/no-duplicates */

import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Popover from './popover';
import popoverSource from '!!raw-loader!./popover';
const popoverHtml = renderToHtml(Popover);

import TrapFocus from './trap_focus';
import trapFocusSource from '!!raw-loader!./trap_focus';
const trapFocusHtml = renderToHtml(TrapFocus);

import PopoverAnchorPosition from './popover_anchor_position';
import popoverAnchorPositionSource from '!!raw-loader!./popover_anchor_position';
const popoverAnchorPositionHtml = renderToHtml(PopoverAnchorPosition);

import PopoverPanelClassName from './popover_panel_class_name';
import popoverPanelClassNameSource from '!!raw-loader!./popover_panel_class_name';
const popoverPanelClassNameHtml = renderToHtml(PopoverPanelClassName);

import PopoverWithTitle from './popover_with_title';
import popoverWithTitleSource from '!!raw-loader!./popover_with_title';
const popoverWithTitleHtml = renderToHtml(PopoverWithTitle);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Popover"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverHtml,
      }]}
    >
      <GuideText>
        Use the Popover component to hide controls or options behind a clickable element.
      </GuideText>

      <GuideDemo>
        <Popover />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Trap focus"
      source={[{
        type: GuideSectionTypes.JS,
        code: trapFocusSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: trapFocusHtml,
      }]}
    >
      <GuideText>
        If the Popover should be responsible for trapping the focus within itself (as opposed
        to a child component), then you should set <GuideCode>ownFocus</GuideCode>.
      </GuideText>

      <GuideDemo>
        <TrapFocus />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Popover with title"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverWithTitleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverWithTitleHtml,
      }]}
    >
      <GuideText>
        Popovers often have need for titling. This can be applied through
        a prop or used separately as its own component
        KuiPopoverTitle nested somewhere in the child
        prop.
      </GuideText>

      <GuideDemo>
        <PopoverWithTitle />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Anchor position"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverAnchorPositionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverAnchorPositionHtml,
      }]}
    >
      <GuideText>
        The alignment and arrow on your popover can be set with
        the anchorPosition prop.
      </GuideText>

      <GuideDemo>
        <PopoverAnchorPosition />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Panel class name and padding size"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverPanelClassNameSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverPanelClassNameHtml,
      }]}
    >
      <GuideText>
        Use the panelPaddingSize prop to adjust the padding
        on the panel within the panel. Use the panelClassName
        prop to pass a custom class to the panel.
        inside a popover.
      </GuideText>

      <GuideDemo>
        <PopoverPanelClassName />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
