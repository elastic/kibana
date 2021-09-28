/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiIcon } from '@elastic/eui';
import React from 'react';
import './discover_view.scss';

interface LastRecentlyAccessedViewProps {
  id: string;
  title: string;
  indexPattern: string;
  onClick: () => void;
  lastAccessedAt?: string;
}

export function LastRecentlyAccessedView(props: LastRecentlyAccessedViewProps) {
  const { title, onClick, lastAccessedAt } = props;

  const getLastAccessedAt = () => {
    if (!lastAccessedAt) {
      return 'unknown';
    }
    return lastAccessedAt;
  };
  return (
    <EuiCard
      layout="horizontal"
      icon={<EuiIcon size="m" type={'discoverApp'} className="discoverLogo__icon" />}
      titleSize="s"
      title={title}
      onClick={onClick}
      style={{ backgroundColor: '#d6ede4' }}
    >
      <EuiFlexGrid>
        <EuiFlexItem grow={false}>
          <EuiIcon type={'timeslider'} size="s" />
        </EuiFlexItem>
        <EuiFlexItem>{`accessed at: ${getLastAccessedAt()}`}</EuiFlexItem>
      </EuiFlexGrid>
    </EuiCard>
  );
}
