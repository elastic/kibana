/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCard, EuiIcon } from '@elastic/eui';
import React from 'react';

export type NavigationType = 'more' | 'less';

interface Props {
  type: NavigationType;
  onClick: () => void;
}

export function NavigationButton(props: Props) {
  const { type, onClick } = props;
  const iconType = type === 'more' ? 'arrowRight' : 'arrowLeft';
  const title = type === 'more' ? 'More' : 'Back';
  return (
    <EuiCard
      icon={<EuiIcon size="xl" type={iconType} className="discoverLogo__icon" />}
      titleSize="s"
      title={title}
      onClick={props.onClick}
      style={{
        backgroundColor: 'rgba(0, 119, 204, 0.1)',
        color: '#0061a6',
      }}
    />
  );
}
