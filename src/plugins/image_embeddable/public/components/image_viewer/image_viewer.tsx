/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useEffect, useState } from 'react';

import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiImage,
  EuiImageProps,
  useIsWithinBreakpoints,
  useResizeObserver,
} from '@elastic/eui';
import { css, SerializedStyles } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FileImage } from '@kbn/shared-ux-file-image';

import { ImageConfig } from '../../types';
import { validateImageConfig } from '../../utils/validate_image_config';
import notFound from './assets/not_found_light.png';
import notFound2x from './assets/not_found_light@2x.png';
import { useImageViewerContext } from './image_viewer_context';

export interface ImageViewerProps {
  imageConfig: ImageConfig;
  className?: string;
  onChange?: () => void;
  onClear?: () => void;
  onError?: () => void;
  onLoad?: () => void;
  onClick?: () => void;
  containerCSS?: SerializedStyles;
  isScreenshotMode?: boolean;
}

export function ImageViewer({
  imageConfig,
  onChange,
  onClear,
  onError,
  onLoad,
  onClick,
  className,
  containerCSS,
  isScreenshotMode,
}: ImageViewerProps) {
  const { getImageDownloadHref, validateUrl } = useImageViewerContext();

  const isImageConfigValid = validateImageConfig(imageConfig, { validateUrl });

  const src =
    imageConfig.src.type === 'url'
      ? imageConfig.src.url
      : getImageDownloadHref(imageConfig.src.fileId);

  const [hasFailedToLoad, setFailedToLoad] = useState<boolean>(false);

  useEffect(() => {
    setFailedToLoad(false);
  }, [src]);

  return (
    <div
      css={[
        css`
          position: relative;
          width: 100%;
          height: 100%;
          .visually-hidden {
            visibility: hidden;
          }
        `,
        containerCSS,
      ]}
    >
      {(hasFailedToLoad || !isImageConfigValid) && <NotFound />}
      {isImageConfigValid && (
        <FileImage
          src={src}
          // uncomment to enable blurhash when it's ready
          // https://github.com/elastic/kibana/issues/145567
          // meta={imageConfig.src.type === 'file' ? imageConfig.src.fileImageMeta : undefined}
          alt={imageConfig.altText ?? ''}
          className={classNames(className, { 'visually-hidden': hasFailedToLoad })}
          title={
            onChange
              ? i18n.translate('imageEmbeddable.imageViewer.selectDifferentImageTitle', {
                  defaultMessage: 'Select a different image',
                })
              : undefined
          }
          loading={isScreenshotMode ? 'eager' : 'lazy'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: imageConfig?.sizing?.objectFit ?? 'contain',
            cursor: onChange || onClick ? 'pointer' : 'initial',
            display: 'block', // needed to remove gap under the image
            backgroundColor: imageConfig.backgroundColor,
          }}
          wrapperProps={{
            style: { display: 'block', height: '100%', width: '100%' },
          }}
          onClick={() => {
            if (onChange) onChange();
            if (onClick) onClick();
          }}
          onLoad={() => {
            if (onLoad) onLoad();
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
  const [resizeRef, setRef] = React.useState<HTMLDivElement | null>(null);
  const isLargeScreen = useIsWithinBreakpoints(['l', 'xl'], true);
  const dimensions = useResizeObserver(resizeRef);
  let mode: 'none' | 'only-image' | 'image-and-text' = 'none';
  if (!resizeRef) {
    mode = 'none';
  } else if (dimensions.height > 200 && dimensions.width > 320 && isLargeScreen) {
    mode = 'image-and-text';
  } else {
    mode = 'only-image';
  }

  return (
    <div
      ref={(node) => setRef(node)}
      css={css`
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        .euiPanel,
        .euiEmptyPrompt__main {
          height: 100%;
          width: 100%;
          max-width: none;
        }
      `}
    >
      {mode === 'only-image' && (
        <NotFoundImage
          css={css`
            object-fit: contain;
            height: 100%;
            width: 100%;
          `}
          wrapperProps={{
            css: css`
              height: 100%;
              width: 100%;
            `,
          }}
        />
      )}
      {mode === 'image-and-text' && (
        <EuiEmptyPrompt
          color="transparent"
          icon={<NotFoundImage />}
          title={
            <p>
              <FormattedMessage
                id="imageEmbeddable.imageViewer.notFoundTitle"
                defaultMessage="Image not found"
              />
            </p>
          }
          layout="horizontal"
          body={
            <p>
              <FormattedMessage
                id="imageEmbeddable.imageViewer.notFoundMessage"
                defaultMessage="We can't find the image you're looking for. It might have been removed, renamed, or it didn't exist in the first place."
              />
            </p>
          }
        />
      )}
    </div>
  );
}

const NotFoundImage = React.memo((props: Partial<Omit<EuiImageProps, 'url'>>) => (
  <EuiImage
    {...props}
    data-test-subj={`imageNotFound`}
    srcSet={`${notFound} 1x, ${notFound2x} 2x`}
    src={notFound}
    alt={i18n.translate('imageEmbeddable.imageViewer.notFoundImageAltText', {
      defaultMessage: `An outer space illustration. In the background is a large moon and two planets. In the foreground is an astronaut floating in space and the numbers '404'.`,
    })}
  />
));
