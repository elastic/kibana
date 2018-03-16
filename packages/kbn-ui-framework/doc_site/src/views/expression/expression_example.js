import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const Expression = require('./expression');
const expressionSource = require('!!raw-loader!./expression');
const expressionHtml = renderToHtml(Expression, { defaultActiveButton: 'example2' });

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ExpressionButton"
      source={[{
        type: GuideSectionTypes.JS,
        code: expressionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: expressionHtml,
      }]}
    >
      <GuideText>
        ExpressionButtons allow you to compress a complicated form into a small space.
      </GuideText>

      <GuideDemo>
        <Expression defaultActiveButton="example2"/>
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);
