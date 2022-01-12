/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import { EuiButtonGroup } from '@elastic/eui';

export const FlameGraphNavigation = ({ getter, setter }) => {
  const dateButtonGroupPrefix = 'fgDateButtonGroup';

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

  const onDateChange = (optionId) => {
    if (optionId === toggleDateSelected) {
      return;
    }
    setToggleDateSelected(optionId);
  };

  useEffect(() => {
    const dateValue = dateButtons.filter((button) => {
      return button.id === toggleDateSelected;
    });

    console.log(new Date().toISOString(), 'started flamechart');
    getter(dateValue[0].value).then((response) => {
      setter(response);
      console.log(new Date().toISOString(), 'finished flamechart');
    });
  }, [toggleDateSelected]);

  return (
    <div>
      <EuiButtonGroup
        legend="This is a basic group"
        options={dateButtons}
        idSelected={toggleDateSelected}
        onChange={(id) => onDateChange(id)}
      />
    </div>
  );
};
