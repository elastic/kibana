/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiCard, EuiIcon } from '@elastic/eui';
import React from 'react';
import './discover_view.scss';

interface LastRecentlyAccessedViewProps {
  id: string;
  title: string;
  indexPattern: string;
}

export function LastRecentlyAccessedView(props: LastRecentlyAccessedViewProps) {
  const { title, id, indexPattern } = props;

  return (
    <EuiCard
      layout="horizontal"
      icon={<EuiIcon size="m" type={'discoverApp'} className="discoverLogo__icon" />}
      titleSize="s"
      title={title}
      onClick={() => {}}
    />
  );
}
