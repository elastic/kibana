/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiImage, EuiSkeletonRectangle, EuiCard, EuiSpacer } from '@elastic/eui';
// @ts-expect-error - this module has no exported types
import domtoimage from 'dom-to-image-more';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

interface Props {
  element: HTMLElement | SVGElement;
}

const PREVIEW_ALT_TEXT = i18n.translate(
  'kbnInspectComponent.inspectFlyout.dataSection.previewImageAltText',
  {
    defaultMessage: 'Preview of the selected element',
  }
);

const PREVIEW_BADGE_LABEL = i18n.translate(
  'kbnInspectComponent.inspectFlyout.dataSection.previewCardLabel',
  {
    defaultMessage: 'Preview',
  }
);

/**
 * The PreviewImage component is responsible for rendering a preview of a given HTML or SVG element.
 */
export const PreviewImage = ({ element }: Props) => {
  const [screenshot, setScreenshot] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const CARD_WIDTH = 280;
  const CARD_HEIGHT = 224;
  /**
   * IMAGE_SIZE is used to set the size of the EuiImage component.
   * Without it, the image would overflow the card in which it is contained.
   */
  const IMAGE_SIZE = 200;

  const cardCss = css`
    width: ${CARD_WIDTH}px;
    height: ${CARD_HEIGHT}px;
    margin: 0 auto;
  `;

  useEffect(() => {
    const generateScreenshot = async () => {
      try {
        if (element instanceof SVGElement) {
          const svgData = new XMLSerializer().serializeToString(element);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || CARD_WIDTH;
            canvas.height = img.height || CARD_HEIGHT;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            setScreenshot(canvas.toDataURL('image/png'));
            URL.revokeObjectURL(url);
          };
          img.src = url;
          return;
        }

        setIsLoading(true);
        const elementRect = element.getBoundingClientRect();
        const elementWidth = elementRect.width;
        const elementHeight = elementRect.height;

        const screenshotDataUrl = await domtoimage.toPng(element, {
          quality: 1,
          cacheBust: true,
          width: elementWidth,
          height: elementHeight,
          style: {
            width: `${elementWidth}px`,
            height: `${elementHeight}px`,
          },
          filter: (node: Node) => {
            if (node instanceof HTMLElement) {
              if (
                node.tagName === 'SCRIPT' ||
                node.style.display === 'none' ||
                node.style.visibility === 'hidden'
              ) {
                return false;
              }
            }
            return true;
          },
        });

        setScreenshot(screenshotDataUrl);
      } catch (err) {
        return;
      } finally {
        setIsLoading(false);
      }
    };

    generateScreenshot();
  }, [element]);

  return (
    <>
      <EuiSkeletonRectangle
        isLoading={isLoading}
        contentAriaLabel={PREVIEW_ALT_TEXT}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        borderRadius="none"
        data-test-subj="inspectFlyoutPreviewImage"
      >
        <EuiCard
          title=""
          betaBadgeProps={{
            label: PREVIEW_BADGE_LABEL,
          }}
          css={cardCss}
          paddingSize="xs"
        >
          <EuiImage alt={PREVIEW_ALT_TEXT} src={screenshot} size={IMAGE_SIZE} hasShadow={false} />
        </EuiCard>
      </EuiSkeletonRectangle>
      <EuiSpacer size="l" />
    </>
  );
};
