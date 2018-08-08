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

import <%= componentExampleName %> from './<%= fileName %>';
const <%= componentExamplePrefix %>Source = require('!!raw-loader!./<%= fileName %>');
const <%= componentExamplePrefix %>Html = renderToHtml(<%= componentExampleName %>);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="<%= componentExampleName %>"
      source={[{
        type: GuideSectionTypes.JS,
        code: <%= componentExamplePrefix %>Source,
      }, {
        type: GuideSectionTypes.HTML,
        code: <%= componentExamplePrefix %>Html,
      }]}
    >
      <GuideText>
        Description needed: how to use the <GuideCode><%= componentExampleName %></GuideCode> component.
      </GuideText>

      <GuideDemo>
        <<%= componentExampleName %> />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
