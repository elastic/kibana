/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useState } from 'react';
import { EuiImage, EuiImageProps } from '@elastic/eui';
import type { FileImageMetadata } from '@kbn/shared-ux-file-image-types';
import { getBlurhashSrc } from '@kbn/shared-ux-file-util';

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
  const imageSrc = (src || url)!; // <EuiImage/> allows to use either `src` or `url`

  const [isBlurHashLoaded, setIsBlurHashLoaded] = useState<boolean>(false);
  const { blurhash, width, height } = meta ?? {};
  const blurhashSrc = React.useMemo(
    () => (blurhash && width && height ? getBlurhashSrc({ hash: blurhash, width, height }) : null),
    [blurhash, width, height]
  );

  // prettier-ignore
  const currentSrc = (isBlurHashLoaded || !blurhashSrc) ? imageSrc : blurhashSrc

  return (
    <EuiImage
      alt=""
      loading={'lazy'}
      {...rest}
      src={currentSrc}
      onLoad={(ev) => {
        // if the `meta.blurhash` is passed, then the component first renders the blurhash and the `onLoad` event fires for the first time,
        // In the event handler we call `onBlurHashLoaded` so that the `currentSrc` is swapped with the url to the original image.
        // When the onLoad event fires for the 2nd time (as the original image is finished loading)
        // we notify the parent component by calling `onLoad` from props
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
