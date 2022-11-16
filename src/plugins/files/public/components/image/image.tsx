/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { useState } from 'react';
import { EuiImage, EuiImageProps } from '@elastic/eui';
import type { FileImageMetadata } from '../../../common';
import { getBlurhashSrc } from '../util';

export type Props = { meta?: FileImageMetadata } & EuiImageProps;

/**
 * A wrapper around the <EuiImage/> that can renders blurhash by the file service while the image is loading
 *
 * @note Intended to be used with files like:
 *
 * ```ts
 * <Image src={file.getDownloadSrc(file)} meta={file.meta} ... />
 * ```
 */
export const Image = ({ src, url, alt, onLoad, onError, meta, ...rest }: Props) => {
  const [isBlurHashLoaded, setIsBlurHashLoaded] = useState<boolean>(false);

  const imageSrc = (src || url)!; // <EuiImage/> allows to use either `src` or `url`

  const { blurhash, width, height } = meta ?? {};
  const blurhashSrc = useMemo(
    () =>
      blurhash && width && height
        ? getBlurhashSrc({
            height,
            width,
            hash: blurhash,
          })
        : null,
    [blurhash, width, height]
  );

  const currentSrc = isBlurHashLoaded || !blurhashSrc ? imageSrc : blurhashSrc;

  return (
    <EuiImage
      alt=""
      {...rest}
      src={currentSrc}
      width={meta?.width}
      height={meta?.height}
      onLoad={(ev) => {
        if (currentSrc === imageSrc) {
          onLoad?.(ev);
        } else {
          // @ts-ignore
          if (window?.__image_stories_simulate_slow_load) {
            // hack for storybook blurhash testing
            setTimeout(() => {
              setIsBlurHashLoaded(true);
            }, 3000);
          } else {
            setIsBlurHashLoaded(true);
          }
        }
      }}
      onError={(ev) => {
        onError?.(ev);
      }}
    />
  );
};
