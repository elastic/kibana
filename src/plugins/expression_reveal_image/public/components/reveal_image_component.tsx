/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { EuiDelayRender, EuiLoadingContent } from '@elastic/eui';
import { debounce } from 'lodash';
import { RevealImageRendererConfig, NodeDimensions } from '../expression_renderers/types';
import { RendererHandlers } from '../../common/types';
import { isValidUrl } from '../../common/lib/url';

interface RevealImageComponentProps {
  handlers: RendererHandlers;
  [property in RevealImageRendererConfig]: RevealImageRendererConfig[property];
  parentNode: HTMLElement;
}

function RevealImageComponent({
  handlers,
  parentNode,
  percent,
  origin,
  image,
  emptyImage,
}: RevealImageComponentProps) {
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState<NodeDimensions>({
    width: 1,
    height: 1,
  });

  const imgRef = useRef(null);

  // modify the top-level container class
  parentNode.className = 'revealImage';

  // set up the overlay image
  const onLoad = useCallback(() => {
    setLoaded(true);
    if (imgRef.current) {
      setDimensions({
        height: imgRef.current.naturalHeight,
        width: imgRef.current.naturalWidth,
      });
      return handlers.done();
    }
  }, [imgRef, handlers]);

  useEffect(() => {
    handlers.onResize(onLoad);
    return () => {
      handlers.destroy();
    };
  }, [onLoad, handlers]);

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
      ratio: dimensions.height / dimensions.width,
    };

    const domNodeDimensions = {
      width: parentNode.clientWidth,
      height: parentNode.clientHeight,
      ratio: parentNode.clientHeight / parentNode.clientWidth,
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

  let imgStyles = {};
  if (imgRef.current && loaded) imgStyles = getImageSizeStyle();

  imgStyles.clipPath = getClipPath(percent, origin);
  if (imgRef.current && loaded) {
    imgRef.current.style.setProperty('-webkit-clip-path', getClipPath(percent, origin));
  }

  return (
    <div className="revealImageAligner" style={alignerStyles}>
      <img
        ref={imgRef}
        onLoad={onLoad}
        className="revealImage__image"
        src={imgSrc}
        alt=""
        role="presentation"
        style={imgStyles}
      />
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { RevealImageComponent as default };
