import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import HeaderBarSandboxContent from './header_bar_sandbox_content';
const headerBarSandboxContentSource = require('!!raw-loader!./header_bar_sandbox_content');
const headerBarSandboxContentHtml = renderToHtml(HeaderBarSandboxContent);

export default props => (
  <GuideSandbox>
    <GuideDemo
      isFullScreen={true}
      html={headerBarSandboxContentHtml}
    />

    <GuideSandboxCodeToggle
      source={[{
        type: GuideSectionTypes.JS,
        code: headerBarSandboxContentSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: headerBarSandboxContentHtml,
      }]}
      title={props.route.name}
    />
  </GuideSandbox>
);
