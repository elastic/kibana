/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useResizeObserver } from '@elastic/eui';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { NodeDimensions, RevealImageRendererConfig, OriginString } from '../../common/types';
import { isValidUrl, elasticOutline } from '../../../presentation_util/public';
import './reveal_image.scss';

interface RevealImageComponentProps extends RevealImageRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

interface ImageStyles {
  width?: string;
  height?: string;
  clipPath?: string;
}

interface AlignerStyles {
  backgroundImage?: string;
}

function RevealImageComponent({
  onLoaded,
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

  const imgRef = useRef<HTMLImageElement>(null);

  const parentNodeDimensions = useResizeObserver(parentNode);

  // modify the top-level container class
  parentNode.className = 'revealImage';

  // set up the overlay image
  const updateImageView = useCallback(() => {
    if (imgRef.current) {
      setDimensions({
        height: imgRef.current.naturalHeight,
        width: imgRef.current.naturalWidth,
      });

      setLoaded(true);
      onLoaded();
    }
  }, [imgRef, onLoaded]);

  useEffect(() => {
    updateImageView();
  }, [parentNodeDimensions, updateImageView]);

  function getClipPath(percentParam: number, originParam: OriginString = 'bottom') {
    const directions: Record<OriginString, number> = { bottom: 0, left: 1, top: 2, right: 3 };
    const values: Array<number | string> = [0, 0, 0, 0];
    values[directions[originParam]] = `${100 - percentParam * 100}%`;
    return `inset(${values.join(' ')})`;
  }

  function getImageSizeStyle() {
    const imgStyles: ImageStyles = {};

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

  const imgSrc = isValidUrl(image ?? '') ? image : elasticOutline;

  const alignerStyles: AlignerStyles = {};

  if (isValidUrl(emptyImage ?? '')) {
    // only use empty image if one is provided
    alignerStyles.backgroundImage = `url(${emptyImage})`;
  }

  let imgStyles: ImageStyles = {};
  if (imgRef.current && loaded) imgStyles = getImageSizeStyle();

  imgStyles.clipPath = getClipPath(percent, origin);
  if (imgRef.current && loaded) {
    imgRef.current.style.setProperty('-webkit-clip-path', getClipPath(percent, origin));
  }

  return (
    <div className="revealImageAligner" style={alignerStyles}>
      <img
        ref={imgRef}
        onLoad={updateImageView}
        className="revealImage__image"
        src={imgSrc ?? ''}
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
