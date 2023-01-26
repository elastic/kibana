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
import type { FileImageMetadata } from '@kbn/shared-ux-file-types';
import { getBlurhashSrc } from '@kbn/shared-ux-file-util';
import classNames from 'classnames';
import { css } from '@emotion/react';

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
  const blurhashSrc = React.useMemo(() => {
    if (blurhash && width && height) {
      try {
        return getBlurhashSrc({ hash: blurhash, width, height });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to generate image src from blurhash`, e);
        return null;
      }
    } else {
      return null;
    }
  }, [blurhash, width, height]);

  // prettier-ignore
  const currentSrc = (isBlurHashLoaded || !blurhashSrc) ? imageSrc : blurhashSrc

  return (
    <EuiImage
      alt={alt ?? ''}
      loading={'lazy'}
      {...rest}
      className={classNames(rest.className, { blurhash: currentSrc === blurhashSrc })}
      css={css`
        &.blurhash {
          // Makes blurhash image visually appear after the .9s delay with a .1s transition duration.
          // This is needed for a nicer UX when the original image loads fast.
          animation-name: imageBlurhashFadeIn;
          animation-duration: 1s;
          @keyframes imageBlurhashFadeIn {
            0% {
              opacity: 0;
            }
            90% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
        }
      `}
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
        if (currentSrc === imageSrc) {
          onError?.(ev);
        } else {
          // blurhash failed to load, consider it is loaded to start loading the full image
          // eslint-disable-next-line no-console
          console.warn(`Failed to load blurhash src`);
          setIsBlurHashLoaded(true);
        }
      }}
    />
  );
};
