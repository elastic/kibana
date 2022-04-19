/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';

import { getTopN, groupSamplesByCategory } from '../../common';

export const StackTraceNavigation = ({ fetchTopN, setTopN }) => {
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

  const dateButtonGroupPrefix = 'dateButtonGroup';

  const dateButtons = [
    {
      id: `${dateButtonGroupPrefix}__0`,
      label: '30m',
      value: '1800',
    },
    {
      id: `${dateButtonGroupPrefix}__1`,
      label: '1h',
      value: '3600',
    },
    {
      id: `${dateButtonGroupPrefix}__2`,
      label: '24h',
      value: '86400',
    },
    {
      id: `${dateButtonGroupPrefix}__3`,
      label: '7d',
      value: '604800',
    },
    {
      id: `${dateButtonGroupPrefix}__4`,
      label: '30d',
      value: '2592000',
    },
  ];

  const [toggleDateSelected, setToggleDateSelected] = useState(`${dateButtonGroupPrefix}__0`);

  const onDateChange = (optionId: string) => {
    if (optionId === toggleDateSelected) {
      return;
    }
    setToggleDateSelected(optionId);
  };

  useEffect(() => {
    const topnValue = topnButtons.filter((button) => {
      return button.id === toggleTopNSelected;
    });

    const dateValue = dateButtons.filter((button) => {
      return button.id === toggleDateSelected;
    });

    console.log(new Date().toISOString(), 'started payload retrieval');
    fetchTopN(topnValue[0].value, dateValue[0].value).then((response) => {
      console.log(new Date().toISOString(), 'finished payload retrieval');
      const samples = getTopN(response);
      const series = groupSamplesByCategory(samples);
      setTopN({ samples, series });
      console.log(new Date().toISOString(), 'updated local state');
    });
  }, [toggleTopNSelected, toggleDateSelected]);

  return (
    <div>
      <EuiButtonGroup
        legend="This is a basic group"
        options={topnButtons}
        idSelected={toggleTopNSelected}
        onChange={(id) => onTopNChange(id)}
      />
      <EuiSpacer size="s" />
      <EuiButtonGroup
        legend="This is a basic group"
        options={dateButtons}
        idSelected={toggleDateSelected}
        onChange={(id) => onDateChange(id)}
      />
    </div>
  );
};
