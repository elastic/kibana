/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement, useEffect, useState } from 'react';
import { times } from 'lodash';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { RepeatImageRendererConfig } from '../../common';

interface RepeatImageComponentProps extends RepeatImageRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

interface LoadedImages {
  image: HTMLImageElement | null;
  emptyImage: HTMLImageElement | null;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = src;
  });
}

async function loadImages(images: string[]): Promise<Array<HTMLImageElement | null>> {
  const results = await Promise.allSettled([...images.map(loadImage)]);
  return results.map((loadedImage) =>
    loadedImage.status === 'rejected' ? null : loadedImage.value
  );
}

function setImageSize(img: HTMLImageElement, size: number) {
  if (img.naturalHeight > img.naturalWidth) {
    img.height = size;
  } else {
    img.width = size;
  }
}

function createImageJSX(img: HTMLImageElement | null) {
  if (!img) {
    return null;
  }
  const params = img.width > img.height ? { height: img.height } : { width: img.width };
  return <img src={img.src} {...params} alt="" />;
}

function RepeatImageComponent({
  max,
  count,
  emptyImage: emptyImageSrc,
  image: imageSrc,
  size,
  onLoaded,
}: RepeatImageComponentProps) {
  const [images, setImages] = useState<LoadedImages>({
    image: null,
    emptyImage: null,
  });

  useEffect(() => {
    loadImages([imageSrc, emptyImageSrc]).then((result) => {
      const [image, emptyImage] = result;
      setImages({ image, emptyImage });
      onLoaded();
    });
  }, [imageSrc, emptyImageSrc, onLoaded]);

  const imagesToRender: Array<ReactElement | null> = [];

  const { image, emptyImage } = images;

  if (max && count > max) count = max;

  if (image) {
    setImageSize(image, size);
    const imgJSX = createImageJSX(image);
    times(count, () => imagesToRender.push(imgJSX));
  }

  if (emptyImage) {
    setImageSize(emptyImage, size);
    const imgJSX = createImageJSX(emptyImage);
    times(max - count, () => imagesToRender.push(imgJSX));
  }

  return (
    <div className="repeatImage" style={{ pointerEvents: 'none' }}>
      {imagesToRender}
    </div>
  );
}
// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { RepeatImageComponent as default };
