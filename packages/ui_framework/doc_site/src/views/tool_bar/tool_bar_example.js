import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import { ToolBar } from './tool_bar';
const toolBarSource = require('!!raw!./tool_bar');
const toolBarHtml = renderToHtml(ToolBar);

import { ToolBarFooter } from './tool_bar_footer';
const toolBarFooterSource = require('!!raw!./tool_bar_footer');
const toolBarFooterHtml = renderToHtml(ToolBarFooter);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ToolBar"
      source={[{
        type: GuideSectionTypes.JS,
        code: toolBarSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: toolBarHtml,
      }]}
    >
      <GuideText>
        Use the ToolBar to surface controls for manipulating and filtering content, e.g. in a
        list, table, or menu.
      </GuideText>

      <GuideDemo>
        <ToolBar />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ToolBarFooter"
      source={[{
        type: GuideSectionTypes.JS,
        code: toolBarFooterSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: toolBarFooterHtml,
      }]}
    >
      <GuideText>
        Use the ToolBarFooter in conjunction with the ToolBar. It can surface secondary
        controls or a subset of the primary controls.
      </GuideText>

      <GuideDemo>
        <ToolBarFooter />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
