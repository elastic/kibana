/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import React from 'react';

/**
 * Elastic cluster mark for the chrome header (aligned with Elastic design system header specs).
 * Replaces the filled `logoElastic` glyph with the outline cluster treatment at 20×20 in a 32×32 tap area.
 * The outer span fills the parent height so the mark stays vertically centered in tall header rails.
 */
export interface ElasticHeaderClusterLogoProps {
  'data-test-subj'?: string;
  ariaLabel: string;
}

const CLUSTER_PATH =
  'M19.9588 10.4153C19.9606 9.60541 19.7119 8.81477 19.2468 8.1517C18.7817 7.48863 18.1229 6.98556 17.3608 6.71141C17.4304 6.35813 17.4655 5.99893 17.4657 5.63886C17.4661 4.44666 17.0884 3.28505 16.3871 2.32096C15.6857 1.35688 14.6968 0.639977 13.5624 0.27328C12.4279 -0.0934161 11.2065 -0.0910217 10.0735 0.28012C8.94057 0.651261 7.95445 1.37204 7.25688 2.33886C6.74247 1.9404 6.11222 1.72043 5.46158 1.71226C4.81095 1.70409 4.17537 1.90817 3.65112 2.29358C3.12685 2.67899 2.74246 3.22475 2.55617 3.84819C2.36986 4.47163 2.39179 5.1388 2.61865 5.74867C1.85452 6.02672 1.19391 6.53218 0.725736 7.19701C0.257561 7.86185 0.00429208 8.65416 1.95671e-05 9.46729C-0.00254504 10.2805 0.247051 11.0744 0.714438 11.7399C1.18182 12.4053 1.84402 12.9095 2.60982 13.1829C2.54345 13.5363 2.51063 13.8951 2.51178 14.2545C2.50965 15.4465 2.8864 16.6081 3.58765 17.572C4.28888 18.5358 5.2783 19.2518 6.41303 19.6165C7.54775 19.9813 8.76903 19.9759 9.90049 19.6012C11.032 19.2265 12.0151 18.5019 12.7078 17.532C13.2208 17.9322 13.8503 18.1541 14.5008 18.1641C15.1513 18.1741 15.7873 17.9717 16.3123 17.5875C16.8373 17.2031 17.2225 16.6581 17.4096 16.035C17.5968 15.412 17.5755 14.7448 17.349 14.1349C18.1117 13.8554 18.7705 13.3491 19.2371 12.6842C19.7035 12.0193 19.9554 11.2275 19.9588 10.4153ZM7.72747 2.94082C8.37015 2.00605 9.31568 1.32167 10.4044 1.00318C11.4932 0.684696 12.6585 0.75163 13.7036 1.19268C14.7488 1.63374 15.6097 2.42188 16.1412 3.42409C16.6725 4.4263 16.842 5.58118 16.6206 6.69376L12.2147 10.5525L7.84708 8.56239L6.99414 6.7418L7.72747 2.94082ZM5.51865 2.45063C6.03661 2.45052 6.54024 2.6207 6.95198 2.93494L6.2912 6.33592L3.29904 5.62906C3.16928 5.27175 3.12739 4.88845 3.17691 4.51155C3.22643 4.13465 3.3659 3.77519 3.58355 3.46351C3.80121 3.15184 4.09065 2.89711 4.42744 2.72082C4.76424 2.54453 5.1385 2.45186 5.51865 2.45063ZM0.771588 9.47612C0.775993 8.78222 0.996843 8.10698 1.40334 7.54459C1.80985 6.98221 2.38173 6.5607 3.03924 6.33886L6.32355 7.11435L7.09414 8.76239L2.89512 12.5604C2.27034 12.3221 1.73274 11.8994 1.35351 11.3486C0.974291 10.7978 0.771356 10.1448 0.771588 9.47612ZM12.251 16.9457C11.6576 17.8192 10.7999 18.4794 9.80361 18.8294C8.80734 19.1793 7.72511 19.2006 6.71587 18.89C5.70663 18.5794 4.82357 17.9534 4.1964 17.1039C3.56923 16.2544 3.231 15.2262 3.23139 14.1702C3.23185 13.841 3.2647 13.5126 3.32943 13.1898L7.62355 9.30357L12.0078 11.3016L12.9784 13.1565L12.251 16.9457ZM14.4451 17.4359C13.9286 17.4341 13.4272 17.2619 13.0186 16.9457L13.6696 13.5555L16.6598 14.2545C16.7899 14.6116 16.8322 14.9945 16.783 15.3713C16.734 15.748 16.595 16.1075 16.3778 16.4192C16.1607 16.731 15.8718 16.9859 15.5354 17.1625C15.199 17.3391 14.825 17.4323 14.4451 17.4339V17.4359ZM16.9196 13.5427L13.6275 12.7731L12.7529 11.1065L17.0588 7.33396C17.6841 7.57039 18.2226 7.99155 18.6028 8.54143C18.983 9.0913 19.1869 9.74387 19.1873 10.4124C19.1811 11.1048 18.9593 11.778 18.5529 12.3387C18.1466 12.8993 17.5757 13.3195 16.9196 13.5408V13.5427Z';

export const ElasticHeaderClusterLogo = ({
  'data-test-subj': dataTestSubj,
  ariaLabel,
}: ElasticHeaderClusterLogoProps) => {
  const { euiTheme } = useEuiTheme();
  const color =
    euiTheme.colorMode === 'DARK' ? euiTheme.colors.plainLight : euiTheme.colors.plainDark;

  return (
    <span
      data-test-subj={dataTestSubj}
      css={css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        blockSize: '100%',
        inlineSize: 'auto',
        minBlockSize: 0,
        borderRadius: 4,
        color,
        flexShrink: 0,
      })}
      role="img"
      aria-label={ariaLabel}
    >
      <span
        css={css({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          width: 32,
          height: 32,
          borderRadius: 4,
          flexShrink: 0,
        })}
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 19.9588 19.8862"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path fill="currentColor" d={CLUSTER_PATH} />
        </svg>
      </span>
    </span>
  );
};
