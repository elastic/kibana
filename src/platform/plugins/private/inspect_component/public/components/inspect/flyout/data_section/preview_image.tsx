/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import {
  useGeneratedHtmlId,
  EuiImage,
  EuiSkeletonRectangle,
  EuiCard,
  EuiSpacer,
} from '@elastic/eui';
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

const PREVIEW_BADGE_LABEL = {
  label: i18n.translate('kbnInspectComponent.inspectFlyout.dataSection.previewCardLabel', {
    defaultMessage: 'Preview',
  }),
};

/**
 * The PreviewImage component is responsible for rendering a scaled-down preview of a given HTML or SVG element.
 * It creates a screenshot-like preview using dom-to-image-more library for better quality and cross-browser support.
 */
export const PreviewImage = ({ element }: Props) => {
  const generatedId = useGeneratedHtmlId();
  const [screenshot, setScreenshot] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const WIDTH = 280;
  const HEIGHT = 224;

  const cardCss = css`
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    margin: 0 auto;
  `;

  useEffect(() => {
    const generateScreenshot = async () => {
      try {
        setIsLoading(true);
        const elementRect = element.getBoundingClientRect();
        const elementWidth = elementRect.width;
        const elementHeight = elementRect.height;

        const screenshotDataUrl = await domtoimage.toPng(element, {
          quality: 0.8,
          bgcolor: 'transparent',
          cacheBust: true,
          width: elementWidth * 2,
          height: elementHeight * 2,
          style: {
            transform: 'scale(2)',
            transformOrigin: 'top left',
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
  }, [element, generatedId]);

  return (
    <>
      <EuiSkeletonRectangle
        isLoading={isLoading}
        contentAriaLabel={PREVIEW_ALT_TEXT}
        width={WIDTH}
        height={HEIGHT}
        borderRadius="none"
        data-test-subj="inspectFlyoutPreviewImage"
        css={cardCss}
      >
        <EuiCard title="" betaBadgeProps={PREVIEW_BADGE_LABEL} paddingSize="s" css={cardCss}>
          <EuiImage size="fullWidth" alt={PREVIEW_ALT_TEXT} src={screenshot} />
        </EuiCard>
      </EuiSkeletonRectangle>
      <EuiSpacer size="l" />
    </>
  );
};
