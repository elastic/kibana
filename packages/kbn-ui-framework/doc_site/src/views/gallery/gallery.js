import React from 'react';

import {
  KuiGallery,
  KuiGalleryItem,
  KuiGalleryItemIcon,
  KuiGalleryItemImage,
  KuiGalleryItemLabel
} from '../../../../components';

export default () => {
  /**
  * These styles are just for demonstration purposes. It is recommended to use
  * properly named classes instead of CSS properties in production code.
  */
  const imageStyle = {
    backgroundColor: 'lightgray'
  };

  return (
    <div>
      <div className="kuiVerticalRhythm">
        <h2 className="kuiSubTitle kuiVerticalRhythmSmall">
          Some items
        </h2>

        <KuiGallery className="kuiVerticalRhythmSmall">
          <KuiGalleryItem href="#">
            <KuiGalleryItemImage style={imageStyle}/>

            <KuiGalleryItemLabel>
              Item A
            </KuiGalleryItemLabel>

            <KuiGalleryItemIcon className="fa-flask"/>
          </KuiGalleryItem>

          <KuiGalleryItem href="#">
            <KuiGalleryItemImage style={imageStyle}/>

            <KuiGalleryItemLabel>
              Item B
            </KuiGalleryItemLabel>
          </KuiGalleryItem>

          <KuiGalleryItem onClick={() => window.alert('Clicked an item')}>
            <KuiGalleryItemImage style={imageStyle}/>

            <KuiGalleryItemLabel>
              Item C
            </KuiGalleryItemLabel>
          </KuiGalleryItem>

          <KuiGalleryItem>
            <KuiGalleryItemImage style={imageStyle}/>

            <KuiGalleryItemLabel>
              Item D
            </KuiGalleryItemLabel>
          </KuiGalleryItem>

          <KuiGalleryItem>
            <KuiGalleryItemImage style={imageStyle}/>

            <KuiGalleryItemLabel>
              Item E
            </KuiGalleryItemLabel>
          </KuiGalleryItem>
        </KuiGallery>
      </div>

      <div className="kuiVerticalRhythm">
        <div className="kuiSubTitle kuiVerticalRhythmSmall">
          Some more items
        </div>

        <KuiGallery className="kuiVerticalRhythmSmall">
          <KuiGalleryItem href="#">
            <KuiGalleryItemImage style={imageStyle}/>

            <KuiGalleryItemLabel>
              Item F
            </KuiGalleryItemLabel>
          </KuiGalleryItem>

          <KuiGalleryItem href="#">
            <KuiGalleryItemImage style={imageStyle}/>

            <KuiGalleryItemLabel>
              Item G with a long label with ellipsis
            </KuiGalleryItemLabel>
          </KuiGalleryItem>
        </KuiGallery>
      </div>
    </div>
  );
};
