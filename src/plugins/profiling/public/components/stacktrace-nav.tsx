/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import { EuiButtonGroup } from '@elastic/eui';

import { getTopN, groupSamplesByCategory } from '../../common';

export const StackTraceNavigation = ({ index, projectID, n, timeRange, fetchTopN, setTopN }) => {
  const topnButtonGroupPrefix = 'topnButtonGroup';

  const topnButtons = [
    {
      id: `${topnButtonGroupPrefix}__0`,
      label: 'Containers',
      value: 'containers',
    },
    {
      id: `${topnButtonGroupPrefix}__1`,
      label: 'Deployments',
      value: 'deployments',
    },
    {
      id: `${topnButtonGroupPrefix}__2`,
      label: 'Threads',
      value: 'threads',
    },
    {
      id: `${topnButtonGroupPrefix}__3`,
      label: 'Hosts',
      value: 'hosts',
    },
    {
      id: `${topnButtonGroupPrefix}__4`,
      label: 'Traces',
      value: 'traces',
    },
  ];

  const [toggleTopNSelected, setToggleTopNSelected] = useState(`${topnButtonGroupPrefix}__0`);

  const onTopNChange = (optionId: string) => {
    if (optionId === toggleTopNSelected) {
      return;
    }
    setToggleTopNSelected(optionId);
  };

  useEffect(() => {
    const topnValue = topnButtons.filter((button) => {
      return button.id === toggleTopNSelected;
    });

    console.log(new Date().toISOString(), 'started payload retrieval');
    fetchTopN(topnValue[0].value, index, projectID, timeRange.unixStart, timeRange.unixEnd, n).then(
      (response) => {
        console.log(new Date().toISOString(), 'finished payload retrieval');
        const samples = getTopN(response);
        const series = groupSamplesByCategory(samples);
        setTopN({ samples, series });
        console.log(new Date().toISOString(), 'updated local state');
      }
    );
  }, [index, projectID, n, timeRange, toggleTopNSelected]);

  return (
    <div>
      <EuiButtonGroup
        legend="This is a basic group"
        options={topnButtons}
        idSelected={toggleTopNSelected}
        onChange={(id) => onTopNChange(id)}
      />
    </div>
  );
};
