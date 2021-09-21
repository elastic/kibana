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
import { ApplicationStart } from 'kibana/public';

interface DiscoverViewProps {
  id: string;
  title: string;
  isTimeBased: boolean;
  application?: ApplicationStart;
}

export function DiscoverView(props: DiscoverViewProps) {

  const { title, isTimeBased, id, application } = props;

  const yesNo = isTimeBased ? 'yes' : 'no';
  const description = `time-based: ${yesNo}`;

  const navigateToDiscover = async () => {
    if (!application) return;
    const path = `#/view/${encodeURIComponent(id)}`;
    await application.navigateToApp('discover', { path });
  };

  return (
    <EuiCard
      layout="horizontal"
      icon={<EuiIcon size="m" type={'discoverApp'} className="discoverLogo__icon" />}
      titleSize="s"
      title={title}
      description={description}
      onClick={navigateToDiscover}
    />
  );
}
