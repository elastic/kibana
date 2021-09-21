/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiCard, EuiFlexGrid, EuiIcon, EuiFlexItem, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import './discover_view.scss';
import { ApplicationStart, SavedObjectsClientContract } from 'kibana/public';

interface DiscoverViewProps {
  id: string;
  title: string;
  isTimeBased: boolean;
  application?: ApplicationStart;
  savedObjectsClient: SavedObjectsClientContract;
}

export function DiscoverView(props: DiscoverViewProps) {
  const { title, isTimeBased, id, application, savedObjectsClient } = props;

  const [dashboardCount, setDashboardCount] = useState<number>(0);

  useEffect(() => {
    async function findDashboardReferences() {
      const dashboards = await savedObjectsClient.find({
        type: 'dashboard',
        hasReference: { type: 'search', id },
      });
      setDashboardCount(dashboards.total);
    }
    findDashboardReferences();
  }, [id, savedObjectsClient]);

  const navigateToDiscover = async () => {
    if (!application) return;
    const path = `#/view/${encodeURIComponent(id)}`;
    await application.navigateToApp('discover', { path });
  };

  const dashboardView = () => {
    const nrOfDashboards = `In: ${dashboardCount} dashboard(s)`;
    return (
      <EuiFlexGrid>
        <EuiFlexItem grow={false}>
          <EuiIcon type={'dashboardApp'} size="s" style={{ marginTop: '2px' }} />
        </EuiFlexItem>
        <EuiFlexItem style={{ marginLeft: '0px' }}>{nrOfDashboards}</EuiFlexItem>
      </EuiFlexGrid>
    );
  };

  const timeBasedView = () => {
    const yesNo = isTimeBased ? 'yes' : 'no';
    return (
      <EuiFlexGrid>
        <EuiFlexItem grow={false}>
          <EuiIcon type={'clock'} size="s" style={{ marginTop: '3px' }} />
        </EuiFlexItem>
        <EuiFlexItem style={{ marginLeft: '-5px' }}>{`time-based: ${yesNo}`}</EuiFlexItem>
      </EuiFlexGrid>
    );
  };

  return (
    <EuiCard
      layout="horizontal"
      icon={<EuiIcon size="m" type={'discoverApp'} className="discoverLogo__icon" />}
      titleSize="s"
      title={title}
      onClick={navigateToDiscover}
    >
      <EuiFlexGrid>
        <EuiFlexItem>{timeBasedView()}</EuiFlexItem>
        <EuiFlexItem>{dashboardView()}</EuiFlexItem>
      </EuiFlexGrid>
    </EuiCard>
  );
}
