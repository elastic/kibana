import React from 'react';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import html from './<%= fileName %>_sandbox.html';

export default props => (
  <GuideSandbox>
    <GuideDemo
      isFullScreen={true}
      html={html}
    />

    <GuideSandboxCodeToggle
      source={[{
        type: GuideSectionTypes.HTML,
        code: html,
      }]}
      title={props.route.name}
    />
  </GuideSandbox>
);
