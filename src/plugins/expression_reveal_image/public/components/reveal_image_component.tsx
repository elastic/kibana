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
import { css, CSSObject } from '@emotion/react';
import { NodeDimensions, RevealImageRendererConfig, OriginString } from '../../common/types';
import { isValidUrl } from '../../../presentation_util/public';

const revealImageParentStyle = css`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const revealImageAlignerStyle: CSSObject = {
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
};

const revealImageStyle: CSSObject = {
  userSelect: 'none',
};

interface RevealImageComponentProps extends RevealImageRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

interface ImageStyles {
  width?: number | string;
  height?: number | string;
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
  parentNode.setAttribute('style', revealImageParentStyle.styles);

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
      imgStyles.height = domNodeDimensions.height;
      imgStyles.width = 'initial';
    } else {
      imgStyles.width = domNodeDimensions.width;
      imgStyles.height = 'initial';
    }

    return imgStyles;
  }

  const additionalAlignerStyles: AlignerStyles = {};

  if (isValidUrl(emptyImage ?? '')) {
    // only use empty image if one is provided
    additionalAlignerStyles.backgroundImage = `url(${emptyImage})`;
  }

  let additionalImgStyles: ImageStyles = {};
  if (imgRef.current && loaded) additionalImgStyles = getImageSizeStyle();

  additionalImgStyles.clipPath = getClipPath(percent, origin);
  if (imgRef.current && loaded) {
    imgRef.current.style.setProperty('-webkit-clip-path', getClipPath(percent, origin));
  }

  return (
    <div
      className="revealImageAligner"
      css={{
        ...revealImageAlignerStyle,
        ...additionalAlignerStyles,
      }}
    >
      <img
        ref={imgRef}
        onLoad={updateImageView}
        css={css({ ...revealImageStyle, ...additionalImgStyles })}
        src={image}
        alt=""
        role="presentation"
      />
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { RevealImageComponent as default };
