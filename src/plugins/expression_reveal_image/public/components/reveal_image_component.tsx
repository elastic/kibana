/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { NodeDimensions, RevealImageRendererConfig, OriginString } from '../../common/types';
import { isValidUrl, elasticOutline } from '../../../presentation_util/public';
import './reveal_image.scss';

interface RevealImageComponentProps extends RevealImageRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

function getClipPath(percentParam: number, originParam: OriginString = 'bottom') {
  const directions: Record<OriginString, number> = { bottom: 0, left: 1, top: 2, right: 3 };
  const values: Array<number | string> = [0, 0, 0, 0];
  values[directions[originParam]] = `${100 - percentParam * 100}%`;
  return `inset(${values.join(' ')})`;
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

  const imgSrc = isValidUrl(image ?? '') ? image : elasticOutline;

  const imgStyles = useMemo(() => {
    if (!imgRef.current || !loaded) {
      return undefined;
    }

    const imageAspectRatio = dimensions.height / dimensions.width;
    const clipPath = getClipPath(percent, origin);
    const containerHeight = parentNodeDimensions.height;
    const containerWidth = parentNodeDimensions.width;

    return css`
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;

      clip-path: ${clipPath};

      width: ${imageAspectRatio > containerHeight / containerWidth
        ? 'intial'
        : `${containerWidth}px`};
      height: ${imageAspectRatio > containerHeight / containerWidth
        ? `${containerHeight}px`
        : 'initial'};
    `;
  }, [loaded, origin, percent, dimensions, parentNodeDimensions]);

  const alignerStyles = useMemo(
    () =>
      isValidUrl(emptyImage ?? '')
        ? css`
            background-size: contain;
            background-repeat: no-repeat;
            background-image: url(${emptyImage});
          `
        : undefined,
    [emptyImage]
  );

  return (
    <div css={alignerStyles}>
      <img
        alt={`${percent * 100} percent of the image is revealed`}
        css={imgStyles}
        onLoad={updateImageView}
        ref={imgRef}
        role="presentation"
        src={imgSrc ?? ''}
      />
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { RevealImageComponent as default };
