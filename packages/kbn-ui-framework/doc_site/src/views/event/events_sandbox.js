import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuideSandbox,
  GuideSandboxCodeToggle,
  GuideSectionTypes,
} from '../../components';

import EventsSandboxContent from './events_sandbox_content';
const eventsSandboxContentSource = require('!!raw-loader!./events_sandbox_content');
const eventsSandboxContentHtml = renderToHtml(EventsSandboxContent);

export default props => (
  <GuideSandbox>
    <GuideDemo
      isFullScreen={true}
      html={eventsSandboxContentHtml}
    />

    <GuideSandboxCodeToggle
      source={[{
        type: GuideSectionTypes.JS,
        code: eventsSandboxContentSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: eventsSandboxContentHtml,
      }]}
      title={props.route.name}
    />
  </GuideSandbox>
);
