/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIconProps } from '@elastic/eui';

/**
 * These are the new icons we've added for search session indicator,
 * likely in future we will remove these when they land into EUI
 */
export const CheckInEmptyCircle = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    width={16}
    height={16}
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15 8c0 3.866-3.134 7-7 7-3.86599 0-7-3.134-7-7 0-3.86599 3.13401-7 7-7 3.866 0 7 3.13401 7 7zm1 0c0 4.4183-3.5817 8-8 8-4.41828 0-8-3.5817-8-8 0-4.41828 3.58172-8 8-8 4.4183 0 8 3.58172 8 8zm-9.14533 2.6459c.098.097.226.146.354.146.128 0 .256-.049.354-.146l4.79173-4.79165c.195-.196.195-.512 0-.708-.196-.195-.512-.195-.708 0L7.20867 9.58486 4.85424 7.2295c-.196-.195-.512-.195-.708 0-.195.196-.195.512 0 .708l2.70843 2.7084z"
    />
  </svg>
);

export const PartialClock = ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    width={16}
    height={16}
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.5 13c3.033 0 5.5-2.467 5.5-5.5S10.533 2 7.5 2c-.27614 0-.5-.22386-.5-.5s.22386-.5.5-.5C11.09 1 14 3.91 14 7.5S11.09 14 7.5 14 1 11.09 1 7.5c0-.27614.22386-.5.5-.5s.5.22386.5.5C2 10.533 4.467 13 7.5 13zM4.6724 1.96808c0 .27614.22386.5.5.5s.5-.22386.5-.5-.22386-.5-.5-.5-.5.22386-.5.5zM2.8627 3.15836c0 .27614.22386.5.5.5s.5-.22386.5-.5c0-.27615-.22386-.5-.5-.5s-.5.22385-.5.5zm-.82355 2.33755c-.27615 0-.5-.22386-.5-.5s.22385-.5.5-.5c.27614 0 .5.22386.5.5s-.22386.5-.5.5zM10.5 7H8V3.5c0-.276-.224-.5-.5-.5s-.5.224-.5.5v4c0 .276.224.5.5.5h3c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z"
    />
  </svg>
);
