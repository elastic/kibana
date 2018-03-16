import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import HeaderBar from './header_bar';
const headerBarSource = require('!!raw-loader!./header_bar');
const headerBarHtml = renderToHtml(HeaderBar);

import HeaderBarTwoSections from './header_bar_two_sections';
const headerBarTwoSectionsSource = require('!!raw-loader!./header_bar_two_sections');
const headerBarTwoSectionsHtml = renderToHtml(HeaderBarTwoSections);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Header Bar"
      source={[{
        type: GuideSectionTypes.JS,
        code: headerBarSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: headerBarHtml,
      }]}
    >
      <GuideDemo>
        <HeaderBar />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Two sections"
      source={[{
        type: GuideSectionTypes.JS,
        code: headerBarTwoSectionsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: headerBarTwoSectionsHtml,
      }]}
    >
      <GuideDemo>
        <HeaderBarTwoSections />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
