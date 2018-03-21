import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Bar from './bar';
const barSource = require('!!raw-loader!./bar');
const barHtml = renderToHtml(Bar);

import BarOneSection from './bar_one_section';
const barOneSectionSource = require('!!raw-loader!./bar_one_section');
const barOneSectionHtml = renderToHtml(BarOneSection);

import BarThreeSections from './bar_three_sections';
const barThreeSectionsSource = require('!!raw-loader!./bar_three_sections');
const barThreeSectionsHtml = renderToHtml(BarThreeSections);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Bar"
      source={[{
        type: GuideSectionTypes.JS,
        code: barSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: barHtml,
      }]}
    >
      <GuideText>
        Use the Bar to organize controls in a horizontal layout. This is especially useful for
        surfacing controls in the corners of a view.
      </GuideText>

      <GuideText>
        <strong>Note:</strong> Instead of using this component with a Table, try using the
        ControlledTable, ToolBar, and ToolBarFooter components.
      </GuideText>

      <GuideDemo>
        <Bar />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="One section"
      source={[{
        type: GuideSectionTypes.JS,
        code: barOneSectionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: barOneSectionHtml,
      }]}
    >
      <GuideText>
        A Bar with one section will align it to the right, by default. To align it to the left,
        just add another section and leave it empty, or don&rsquo;t use a Bar at all.
      </GuideText>

      <GuideDemo>
        <BarOneSection />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Three sections"
      source={[{
        type: GuideSectionTypes.JS,
        code: barThreeSectionsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: barThreeSectionsHtml,
      }]}
    >
      <GuideText>
        Technically the Bar can contain three or more sections, but there&rsquo;s no established use-case
        for this.
      </GuideText>

      <GuideDemo>
        <BarThreeSections />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
