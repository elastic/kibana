/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { FieldsBrowser } from '../fields_browser';
import { createMockHttp, createMockGetColumnMap } from './mocks';

const meta: Meta<typeof FieldsBrowser> = {
  title: 'ES|QL Resource Browser/Fields Browser',
  component: FieldsBrowser,
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
};

export default meta;
type Story = StoryObj<typeof FieldsBrowser>;

const InteractiveWrapper = ({
  queryString = 'FROM logs-* | ',
  suggestedFieldNames,
}: {
  queryString?: string;
  suggestedFieldNames?: Set<string>;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const http = createMockHttp();
  const getColumnMap = createMockGetColumnMap();

  return (
    <FieldsBrowser
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        action('onClose')();
      }}
      onSelect={(fieldName, oldLength) => {
        action('onSelect')(fieldName, oldLength);
      }}
      http={http}
      getColumnMap={getColumnMap}
      queryString={queryString}
      suggestedFieldNames={suggestedFieldNames}
      position={{ top: 100, left: 100 }}
    />
  );
};

export const Default: Story = {
  render: () => <InteractiveWrapper />,
};

export const WithSuggestedFields: Story = {
  render: () => (
    <InteractiveWrapper
      suggestedFieldNames={new Set(['@timestamp', 'message', 'host.name', 'bytes'])}
    />
  ),
};
