/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import classNames from 'classnames';
import { EuiCard, EuiCardProps, EuiIcon, IconType } from '@elastic/eui';

export interface SynopsisProps {
  id: string;
  title: string;
  description: string;
  iconUrl?: string;
  iconType?: IconType;
  url?: string;
  isBeta?: boolean;
  onClick?: EuiCardProps['onClick'];
  wrapInPanel: boolean;
}
export function Synopsis({
  id,
  title,
  description,
  iconUrl,
  iconType,
  url,
  isBeta,
  onClick,
  wrapInPanel,
}: SynopsisProps) {
  let optionalImg;

  const classes = classNames('homSynopsis__card', {
    'homSynopsis__card--noPanel': !wrapInPanel,
  });
  const betaBadgeProps = isBeta ? { label: 'Beta' } : undefined;
  if (iconUrl) {
    optionalImg = <img alt="" className="synopsisIcon" src={iconUrl} />;
  } else if (iconType) {
    optionalImg = <EuiIcon color="text" size="l" title="" type={iconType} />;
  }

  return (
    <EuiCard
      {...(betaBadgeProps && { betaBadgeProps })}
      className={classes}
      layout="horizontal"
      icon={optionalImg}
      titleSize="xs"
      title={title}
      description={description}
      onClick={onClick}
      href={url}
      data-test-subj={`homeSynopsisLink${id.toLowerCase()}`}
      titleElement="h3"
    />
  );
}
