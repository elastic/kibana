import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import {
  Link,
} from 'react-router';

const toggleButtonHtml = require('./toggle_button.html');
const toggleButtonJs = require('raw-loader!./toggle_button.js');
const toggleButtonDisabledHtml = require('./toggle_button_disabled.html');
const togglePanelHtml = require('./toggle_panel.html');
const togglePanelJs = require('raw-loader!./toggle_panel.js');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ToggleButton"
      source={[{
        type: GuideSectionTypes.HTML,
        code: toggleButtonHtml,
      }]}
    >
      <GuideText>
        You can use this button to reveal and hide content. For a complete example
        on how to make an collapsable panel proper accessible, read
        the <Link to="collapsebutton" className="guideLink">CollapseButton</Link> documentation.
      </GuideText>

      <GuideDemo
        html={toggleButtonHtml}
        js={toggleButtonJs}
      />
    </GuideSection>

    <GuideSection
      title="ToggleButton, disabled"
      source={[{
        type: GuideSectionTypes.HTML,
        code: toggleButtonDisabledHtml,
      }]}
    >
      <GuideDemo
        html={toggleButtonDisabledHtml}
      />
    </GuideSection>

    <GuideSection
      title="TogglePanel"
      source={[{
        type: GuideSectionTypes.HTML,
        code: togglePanelHtml,
      }]}
    >
      <GuideDemo
        html={togglePanelHtml}
        js={togglePanelJs}
      />
    </GuideSection>
  </GuidePage>
);
