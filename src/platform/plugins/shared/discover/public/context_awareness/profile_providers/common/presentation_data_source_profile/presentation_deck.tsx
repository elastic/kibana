/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { INSPECTOR_REPLAY_SLIDES } from './slides';

/**
 * Full-bleed HTML slide deck rendered in place of Discover's chart/table for
 * presentation tabs.
 */
export const PresentationDeck = ({ histogramCss }: ChartSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const [index, setIndex] = useState(0);
  const slides = INSPECTOR_REPLAY_SLIDES;
  const slide = slides[index];
  const isTitle = slide.variant === 'title';

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(slides.length - 1, current + 1));
  }, [slides.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'Home') {
        event.preventDefault();
        setIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setIndex(slides.length - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, slides.length]);

  return (
    <div
      className="unifiedHistogram__chart eui-fullHeight"
      css={[
        histogramCss,
        css`
          height: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
        `,
      ]}
    >
      <div
        css={css`
          flex: 1 1 auto;
          min-height: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: linear-gradient(145deg, #0b1f33 0%, #12344d 48%, #0e2740 100%);
          color: #f5f7fa;
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
          position: relative;
          font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        `}
        data-test-subj="discoverPresentationDeck"
        role="region"
        aria-label="Presentation"
      >
        <div
          css={css`
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 85% 15%, rgba(0, 149, 255, 0.22), transparent 42%),
              radial-gradient(circle at 10% 90%, rgba(0, 191, 179, 0.16), transparent 36%);
            pointer-events: none;
          `}
        />

        <div
          css={css`
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 6px;
            background: linear-gradient(180deg, #0095ff 0%, #00bfb3 100%);
          `}
        />

        <div
          css={css`
            position: relative;
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: ${isTitle ? 'center' : 'stretch'};
            padding: 48px 64px;
            gap: ${euiTheme.size.l};
            width: 100%;
          `}
        >
          {slide.eyebrow && (
            <div
              css={css`
                font-size: 13px;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: #7ec8ff;
                font-weight: 600;
                text-align: ${isTitle ? 'center' : 'left'};
              `}
            >
              {slide.eyebrow}
            </div>
          )}

          <h1
            css={css`
              margin: 0;
              font-size: ${isTitle ? '52px' : '40px'};
              line-height: 1.15;
              font-weight: 700;
              letter-spacing: -0.02em;
              text-align: ${isTitle ? 'center' : 'left'};
              max-width: ${isTitle ? '28ch' : '100%'};
              width: ${isTitle ? 'auto' : '100%'};
            `}
          >
            {slide.title}
          </h1>

          {slide.body && (
            <p
              css={css`
                margin: 0;
                font-size: ${isTitle ? '22px' : '20px'};
                line-height: 1.5;
                color: #c9d4e0;
                text-align: ${isTitle ? 'center' : 'left'};
                max-width: ${isTitle ? '48rem' : '100%'};
                width: ${isTitle ? 'auto' : '100%'};
              `}
            >
              {slide.body}
            </p>
          )}

          {slide.bullets && (
            <ul
              css={css`
                margin: ${euiTheme.size.m} 0 0;
                padding: 0;
                list-style: none;
                display: flex;
                flex-direction: column;
                gap: 14px;
                max-width: 100%;
                width: 100%;
              `}
            >
              {slide.bullets.map((bullet) => (
                <li
                  key={bullet}
                  css={css`
                    display: flex;
                    gap: 14px;
                    align-items: flex-start;
                    font-size: 20px;
                    line-height: 1.45;
                    color: #e8eef5;
                  `}
                >
                  <span
                    css={css`
                      flex: 0 0 auto;
                      width: 10px;
                      height: 10px;
                      margin-top: 8px;
                      border-radius: 50%;
                      background: #00bfb3;
                      box-shadow: 0 0 0 4px rgba(0, 191, 179, 0.18);
                    `}
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {slide.footer && (
            <p
              css={css`
                margin: ${euiTheme.size.xl} 0 0;
                font-size: 16px;
                color: #8fa3b8;
                text-align: ${isTitle ? 'center' : 'left'};
              `}
            >
              {slide.footer}
            </p>
          )}
        </div>

        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="m"
          css={css`
            position: relative;
            flex: 0 0 auto;
            padding: 16px 28px 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(0, 0, 0, 0.18);
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiButtonIcon
                aria-label="Previous slide"
                iconType="arrowLeft"
                color="ghost"
                onClick={goPrev}
                disabled={index === 0}
                data-test-subj="discoverPresentationPrev"
              />
              <EuiButtonIcon
                aria-label="Next slide"
                iconType="arrowRight"
                color="ghost"
                onClick={goNext}
                disabled={index === slides.length - 1}
                data-test-subj="discoverPresentationNext"
              />
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {slides.map((item, slideIndex) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Go to slide ${slideIndex + 1}`}
                  onClick={() => setIndex(slideIndex)}
                  css={css`
                    width: ${slideIndex === index ? '22px' : '8px'};
                    height: 8px;
                    border: 0;
                    border-radius: 999px;
                    cursor: pointer;
                    background: ${slideIndex === index ? '#0095ff' : 'rgba(255, 255, 255, 0.28)'};
                    transition: width 120ms ease, background 120ms ease;
                  `}
                />
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <span
              css={css`
                font-size: 13px;
                color: #98a2b3;
                font-variant-numeric: tabular-nums;
              `}
              data-test-subj="discoverPresentationSlideCount"
            >
              {index + 1} / {slides.length}
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
