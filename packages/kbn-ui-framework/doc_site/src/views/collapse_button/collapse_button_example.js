import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import CollapseButton from './collapse_button';
const collapseButtonSource = require('!!raw-loader!./collapse_button');
const collapseButtonHtml = renderToHtml(CollapseButton);

import CollapseButtonAria from './collapse_button_aria';
const collapseButtonAriaSource = require('!!raw-loader!./collapse_button_aria');
const collapseButtonAriaHtml = renderToHtml(CollapseButtonAria);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="CollapseButton"
      source={[{
        type: GuideSectionTypes.JS,
        code: collapseButtonSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: collapseButtonHtml,
      }]}
    >
      <GuideText>
        Use this button to collapse and expand panels, drawers, sidebars, legends, and other
        containers.
      </GuideText>

      <GuideDemo>
        <CollapseButton />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="CollapseButton accessibility"
      source={[{
        type: GuideSectionTypes.JS,
        code: collapseButtonAriaSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: collapseButtonAriaHtml,
      }]}
    >
      <GuideText>
        To make an expandable element properly accessible you should add the following
        ARIA-attributes to it:
        <dl>
          <dt><code>aria-expanded</code></dt>
          <dd>
            should be <code>true</code> or <code>false</code> depending on
            the state of the collapsable content.
          </dd>
          <dt><code>aria-controls</code></dt>
          <dd>should reference the <code>id</code> of the actual collapsable content element.</dd>
          <dt><code>aria-label</code></dt>
          <dd>
            should contain a label like &quot;Toggle panel&quot; or preferably more specific what
            it toggles (e.g. &quot;Toggle filter actions&quot;). You don&rsquo;t need to switch the label
            when the state changes, since a screen reader will use <code>aria-expanded</code> to
            read out the current state.
          </dd>
        </dl>
        The following example demonstrate the usage of these attributes.
      </GuideText>

      <GuideDemo>
        <CollapseButtonAria />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
