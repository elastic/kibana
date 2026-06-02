/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

interface SecondaryPanelIconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
  titleId?: string;
}

const MENU_HIDDEN_PATH =
  'M14 1C14.5523 1 15 1.44771 15 2V14C15 14.5523 14.5523 15 14 15H2C1.44772 15 1 14.5523 1 14V2C1 1.44772 1.44771 1 2 1H14ZM6.5 14H14V2H6.5V14ZM2 14H5.5V2H2V14Z';

const MENU_SHOWN_PATH =
  'M14 1C14.5523 1 15 1.44771 15 2V14C15 14.5523 14.5523 15 14 15H2C1.44772 15 1 14.5523 1 14V2C1 1.44772 1.44771 1 2 1H14ZM6.5 12.5605V14H7.14648L14 7.14648V5.06055L6.5 12.5605ZM8.56055 14H10.6465L14 10.6465V8.56055L8.56055 14ZM12.0605 14H14V12.0605L12.0605 14ZM2 14H5.5V2H2V14ZM6.5 9.06055V11.1465L14 3.64648V2H13.5605L6.5 9.06055ZM6.5 5.56055V7.64648L12.1465 2H10.0605L6.5 5.56055ZM6.5 4.14648L8.64648 2H6.5V4.14648Z';

const SecondaryPanelIcon = ({
  path,
  title,
  titleId,
  ...svgProps
}: SecondaryPanelIconProps & { path: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    aria-labelledby={titleId}
    {...svgProps}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path fill="currentColor" d={path} />
  </svg>
);

/** Secondary navigation panel is hidden. */
export const SecondaryPanelMenuHiddenIcon = (props: SecondaryPanelIconProps) => (
  <SecondaryPanelIcon path={MENU_HIDDEN_PATH} {...props} />
);

/** Secondary navigation panel is shown. */
export const SecondaryPanelMenuShownIcon = (props: SecondaryPanelIconProps) => (
  <SecondaryPanelIcon path={MENU_SHOWN_PATH} {...props} />
);
