/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Image } from '@kbn/files-plugin/public';
import { EuiButtonIcon, EuiEmptyPrompt, EuiImage, useEuiTheme } from '@elastic/eui';
import { ImageConfig } from '../types';
import notFound from './not_found/not_found_light.png';
import notFound2x from './not_found/not_found_light@2x.png';
import { validateImageConfig } from '../utils/validate_image_config';
import { createValidateUrl } from '../utils/validate_url';

// TODO: support dark theme also

export interface ImageViewerContextValue {
  getImageDownloadHref: (fileId: string) => string;
  validateUrl: ReturnType<typeof createValidateUrl>;
}

export const ImageViewerContext = createContext<ImageViewerContextValue>(
  null as unknown as ImageViewerContextValue
);

const useImageViewerContext = () => {
  const ctx = useContext(ImageViewerContext);
  if (!ctx) {
    throw new Error('ImageViewerContext is not found!');
  }
  return ctx;
};

export function ImageViewer({
  imageConfig,
  onChange,
  onClear,
  onError,
}: {
  imageConfig: ImageConfig;
  onChange?: () => void;
  onClear?: () => void;
  onError?: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const { getImageDownloadHref, validateUrl } = useImageViewerContext();

  const isImageConfigValid = validateImageConfig(imageConfig, { validateUrl });

  const src =
    imageConfig.src.type === 'url'
      ? imageConfig.src.url
      : getImageDownloadHref(imageConfig.src.fileId);

  // TODO: needs fixes on <Blurhash/> side to position the same as the image
  // const blurHash =
  //   imageConfig.src.type === 'file' ? imageConfig.src.fileImageMeta?.blurHash : undefined;

  const [hasFailedToLoad, setFailedToLoad] = useState<boolean>(false);

  useEffect(() => {
    setFailedToLoad(false);
  }, [src]);

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: imageConfig.backgroundColor || euiTheme.colors.lightestShade,
        width: '100%',
        height: '100%',
      }}
      css={`
        .visually-hidden {
          clip: rect(0 0 0 0);
          clip-path: inset(50%);
          height: 1px;
          overflow: hidden;
          position: absolute;
          white-space: nowrap;
          width: 1px;
        }
      `}
    >
      {(hasFailedToLoad || !isImageConfigValid) && <NotFound />}
      {isImageConfigValid && (
        <Image
          src={src}
          // meta={imageConfig.src.type === 'file' ? imageConfig.src.fileImageMeta : undefined}
          alt={imageConfig.altText ?? ''}
          className={hasFailedToLoad ? `visually-hidden` : ''}
          title={onChange ? 'Click to select a different image' : undefined}
          style={{
            width: '100%',
            height: '100%',
            aspectRatio: '16 / 9',
            objectFit: imageConfig?.sizing?.objectFit ?? 'cover',
            cursor: onChange ? 'pointer' : 'initial',
            display: 'block', // needed to remove gap under the image
          }}
          wrapperProps={{
            style: { display: 'block', height: '100%', width: '100%', aspectRatio: '16 / 9' },
          }}
          onClick={() => {
            if (onChange) onChange();
          }}
          onError={() => {
            setFailedToLoad(true);
            if (onError) onError();
          }}
        />
      )}
      {onClear && (
        <EuiButtonIcon
          style={{ position: 'absolute', top: '-4px', right: '-4px' }}
          display="fill"
          iconType="cross"
          aria-label="Clear"
          color="danger"
          onClick={() => {
            if (onClear) onClear();
          }}
        />
      )}
    </div>
  );
}

function NotFound() {
  return (
    <EuiEmptyPrompt
      css={`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        max-width: none;
        .euiEmptyPrompt__main {
          height: 100%;
        }
      `}
      color="subdued"
      icon={
        <EuiImage
          className={`eui-hideFor--xs eui-hideFor--s eui-hideFor--m`}
          srcSet={`${notFound} 1x, ${notFound2x} 2x`}
          src={notFound}
          alt="An outer space illustration. In the background is a large moon and two planets. In the foreground is an astronaut floating in space and the numbers '404'."
        />
      }
      title={<h3>Image not found</h3>}
      layout="horizontal"
      body={
        <p>
          Sorry, we can&apos;t find the image you&apos;re looking for. It might have been removed or
          renamed, or maybe it never existed.
        </p>
      }
    />
  );
}
