import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import Menu from './menu';
const menuSource = require('!!raw-loader!./menu');
const menuHtml = renderToHtml(Menu);

import MenuContained from './menu_contained';
const menuContainedSource = require('!!raw-loader!./menu_contained');
const menuContainedHtml = renderToHtml(MenuContained);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Menu"
      source={[{
        type: GuideSectionTypes.JS,
        code: menuSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: menuHtml,
      }]}
    >
      <GuideDemo>
        <Menu />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Menu, contained"
      source={[{
        type: GuideSectionTypes.JS,
        code: menuContainedSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: menuContainedHtml,
      }]}
    >
      <GuideDemo>
        <MenuContained />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
