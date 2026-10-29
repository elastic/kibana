/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';

/**
 * Static Elastic loader ring (settled design) used by the legacy browser
 * error screen (see `template.tsx`). The animated boot splash uses the
 * `<elastic-loader-ring>` web component from `/ui/loader_ring.js` instead.
 *
 * Geometry matches the Loader Ring handoff static SVG:
 *   - viewBox 120×120, r = 55.5, stroke width 5
 *   - segment colours / angles from the design spec
 *   - centre mark path from `logo_path.ts` (handoff)
 *
 * Mark fill is themed via `.kbnLoaderMark` in `styles.tsx` (light `#1C1E23`,
 * dark flip). The SVG is decorative (`aria-hidden`).
 */

/** Centre mark path — keep in sync with handoff `logo_path.ts`. */
export const LOADING_ELASTIC_RING_MARK_PATH =
  'M60.6368 42.3681C62.8721 41.7487 65.2525 41.9145 67.3799 42.8388C69.51 43.7649 71.2596 45.3919 72.3379 47.4491C73.4184 49.5094 73.7651 51.8766 73.3204 54.1601C74.695 54.6586 75.8818 55.5707 76.7178 56.7704C77.556 57.9714 78.0037 59.4015 78 60.8661C77.9928 62.3368 77.5364 63.7701 76.6924 64.9745C75.8503 66.1765 74.6603 67.0916 73.2823 67.5966C73.6838 68.6996 73.717 69.9035 73.378 71.0272C73.0389 72.151 72.3449 73.135 71.4004 73.8319C70.4567 74.5254 69.3127 74.8928 68.1416 74.8778C66.9703 74.8628 65.8351 74.4666 64.9092 73.7489C63.6606 75.4996 61.8876 76.8087 59.8467 77.4862C57.8078 78.1627 55.606 78.1713 53.5616 77.5116C51.5152 76.8501 49.7319 75.5547 48.4698 73.8134C47.2049 72.0691 46.5251 69.969 46.5274 67.8143C46.5271 67.1634 46.5871 66.5137 46.7071 65.8739C45.3247 65.3785 44.13 64.4659 43.2881 63.2626C42.4446 62.0566 41.9947 60.6191 42 59.1474C42.0077 57.6766 42.4644 56.2433 43.3086 55.039C44.1519 53.8368 45.3435 52.922 46.7227 52.4179C46.3155 51.3143 46.277 50.1076 46.6133 48.9804C46.9497 47.8533 47.6428 46.8659 48.5879 46.1659C49.5324 45.4689 50.6788 45.099 51.8526 45.1132C53.0263 45.1274 54.1636 45.5244 55.0909 46.244C56.4427 44.3567 58.3998 42.9891 60.6368 42.3681ZM47.9991 65.8798L48 65.8817C47.7511 67.1069 47.7606 68.3708 48.0293 69.5917C48.2981 70.8126 48.8193 71.9642 49.5596 72.9716C50.6894 74.5081 52.2835 75.6406 54.1055 76.204C55.9253 76.7659 57.8775 76.7285 59.6739 76.0956C61.473 75.4614 63.0214 74.2661 64.0909 72.6864L65.4024 65.8222L63.6534 62.4638L55.7442 58.8515L47.9991 65.8798ZM65.4825 72.6864C66.2179 73.2572 67.1218 73.5676 68.0528 73.5692C68.739 73.5675 69.4151 73.4003 70.0225 73.0809C70.6297 72.7617 71.1506 72.3002 71.5411 71.7362C71.9337 71.1714 72.1852 70.5199 72.2735 69.8378C72.3617 69.1557 72.2847 68.4624 72.0489 67.8163L66.6485 66.5507L65.4825 72.6864ZM65.004 62.1073L66.5791 65.1337L72.5196 66.5263C73.7059 66.1248 74.737 65.362 75.4688 64.3456C76.2023 63.3275 76.6007 62.1063 76.6084 60.8515C76.6081 59.6424 76.2411 58.4618 75.5557 57.4657C74.8714 56.4709 73.9001 55.7074 72.7715 55.2782L65.004 62.1073ZM47.4815 53.4911C46.3129 53.8782 45.2925 54.6178 44.5616 55.6083C43.829 56.6004 43.4203 57.7943 43.3916 59.0272C43.3631 60.2603 43.7164 61.4719 44.4024 62.497C45.0874 63.5206 46.0713 64.3082 47.2198 64.747L54.795 57.8837L53.4053 54.9022L47.4815 53.4911ZM65.8956 43.8622C64.0835 43.299 62.1381 43.3329 60.3467 43.9589C58.5529 44.586 57.0071 45.7716 55.9366 47.3417L54.6163 54.2245L56.1534 57.5087L56.1524 57.5106L64.0303 61.1229L71.9795 54.1327C72.0946 53.5562 72.1519 52.9696 72.1504 52.3817C72.1512 50.4784 71.5441 48.6241 70.418 47.0897C69.2945 45.5582 67.7091 44.4269 65.8956 43.8622ZM51.9844 46.4579C51.0643 46.4532 50.1671 46.747 49.4278 47.2948C48.6884 47.8456 48.1457 48.62 47.8799 49.5028C47.6141 50.3857 47.6388 51.3307 47.9512 52.1981L47.9493 52.2001L53.3487 53.4794L54.5323 47.3212C53.7985 46.7658 52.9047 46.4626 51.9844 46.4579Z';

/** Static design segments — keep in sync with handoff README / static SVG. */
const RING_SEGMENTS: ReadonlyArray<{
  color: string;
  dasharray: string;
  dashoffset: string;
}> = [
  { color: '#FEC514', dasharray: '69.74 348.72', dashoffset: '0' },
  { color: '#48EFCF', dasharray: '125.54 348.72', dashoffset: '-69.74' },
  { color: '#0B64DD', dasharray: '36.23 348.72', dashoffset: '-195.28' },
  { color: '#FF957D', dasharray: '48.43 348.72', dashoffset: '-231.51' },
  { color: '#F04E98', dasharray: '68.77 348.72', dashoffset: '-279.94' },
];

export const Logo: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="120"
    height="120"
    viewBox="0 0 120 120"
    fill="none"
    data-type="loadingElasticRing"
    className="kbnLoader"
    aria-hidden="true"
  >
    {RING_SEGMENTS.map(({ color, dasharray, dashoffset }) => (
      <circle
        key={color}
        cx="60"
        cy="60"
        r="55.5"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={dasharray}
        strokeDashoffset={dashoffset}
      />
    ))}
    <path
      className="kbnLoaderMark"
      fillRule="evenodd"
      clipRule="evenodd"
      d={LOADING_ELASTIC_RING_MARK_PATH}
    />
  </svg>
);
