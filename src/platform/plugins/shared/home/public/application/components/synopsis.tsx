/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
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
}

export function Synopsis({
  id,
  description,
  iconUrl,
  iconType,
  title,
  url,
  onClick,
  isBeta = false,
}: SynopsisProps) {
  let optionalImg;
  const betaBadgeProps = isBeta ? { label: 'Beta' } : undefined;

  if (iconUrl) {
    optionalImg = <img alt="" className="synopsisIcon" src={iconUrl} />;
  } else if (iconType) {
    optionalImg = <EuiIcon color="text" size="l" title="" type={iconType} />;
  }

  return (
    <EuiCard
      {...(betaBadgeProps && { betaBadgeProps })}
      className="homSynopsis__card"
      data-test-subj={`homeSynopsisLink${id.toLowerCase()}`}
      description={description}
      href={url}
      icon={optionalImg}
      layout="horizontal"
      onClick={onClick}
      title={title}
      titleElement="h3"
      titleSize="xs"
    />
  );
}
