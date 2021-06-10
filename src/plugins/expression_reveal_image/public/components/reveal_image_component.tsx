/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useLoaded, useCallback } from 'react';
import { RevealImageRendererConfig, NodeDimensions } from '../expression_renderers/types';
import { RendererHandlers } from '../../common/types';

interface RevealImageComponentProps {
  handlers: RendererHandlers;
  [property in RevealImageRendererConfig]: RevealImageRendererConfig[property];
  parentNodeDimensions: NodeDimensions;
}

function RevealImageComponent({
  handlers,
  parentNodeParameters,
  percent,
  origin,
  image,
  emptyImage,
}: RevealImageComponentProps) {
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState<NodeDimensions>({
    width: 0,
    height: 0,
  });

  const imgRef = useRef(null);

  // set up the overlay image
  const onLoad = useCallback(() => {
    setLoaded(true);
    if (imgRef.current) {
      setDimensions(
        {
          height: imgRef.current.naturalHeight,
          width: imgRef.current.naturalWidth,
        },
        // () => handlers.done()
      );
      console.log('here');
    }
  }, [imgRef, handlers]);

  useEffect(() => {
    // handlers.onResize(onLoad);
    return handlers.destroy();
  }, [handlers, onLoad]);

  function getClipPath(percentParam: number, originParam = 'bottom') {
    const directions: Record<typeof origin, number> = { bottom: 0, left: 1, top: 2, right: 3 };
    const values: Array<number | string> = [0, 0, 0, 0];
    values[directions[originParam]] = `${100 - percentParam * 100}%`;
    return `inset(${values.join(' ')})`;
  }

  function getImageSizeStyle() {
    const imgStyles = {};

    const imgDimensions = {
      height: dimensions.height,
      width: dimensions.width,
      ratio: dimensions.width > 0 ? dimensions.height / dimensions.width : 0,
    };

    const domNodeDimensions = {
      height: parentNodeParameters.height,
      width: parentNodeParameters.width,
      ratio: parentNodeParameters.height / parentNodeParameters.width,
    };

    if (imgDimensions.ratio > domNodeDimensions.ratio) {
      imgStyles.height = `${domNodeDimensions.height}px`;
      imgStyles.width = 'initial';
    } else {
      imgStyles.width = `${domNodeDimensions.width}px`;
      imgStyles.height = 'initial';
    }

    return imgStyles;
  }

  const imgSrc = isValidUrl(image) ? image : elasticOutline;

  const alignerStyles = {};
  if (isValidUrl(emptyImage)) {
    // only use empty image if one is provided
    alignerStyles.backgroundImage = `url(${emptyImage})`;
  }

  const imgStyles = {};
  if (imgRef.current && loaded) imgStyles = getImageSizeStyle();

  imgStyles.clipPath = getClipPath(percent, origin);
  if (imgRef.current && loaded) {
    imgRef.current.style.setProperty('-webkit-clip-path', getClipPath(percent, origin));
  }

  return (
    <div className="revealImageAligner" styles={alignerStyles}>
      <img
        ref={imgRef}
        onLoad={onLoad}
        className="revealImage__image"
        src={imgSrc}
        alt=""
        role="presentation"
        styles={imgStyle}
      />
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { RevealImageComponent as default };
