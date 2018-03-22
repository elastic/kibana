import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText
} from '../../components';

import Gallery from './gallery';
const gallerySource = require('!!raw-loader!./gallery');
const galleryHtml = renderToHtml(Gallery);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Gallery"
      source={[{
        type: GuideSectionTypes.JS,
        code: gallerySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: galleryHtml,
      }]}
    >
      <GuideText>
        Use GalleryItem to show a gallery item.
        If you specify an <GuideCode>href</GuideCode> property the item will render
        as an HTML <GuideCode>a</GuideCode> element. If not, it will be rendered
        as a <GuideCode>button</GuideCode> and you can attach an
        <GuideCode>onClick</GuideCode> listener to it.
      </GuideText>

      <GuideText>
        <strong>Note:</strong> You are not allowed to specify the <GuideCode>href</GuideCode> property
        and the <GuideCode>onClick</GuideCode> property at the same time.
      </GuideText>

      <GuideDemo>
        <Gallery />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
