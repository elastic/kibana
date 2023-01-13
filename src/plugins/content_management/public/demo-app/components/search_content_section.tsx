/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';
import { EuiButton, EuiInMemoryTable, EuiSpacer, EuiTitle } from '@elastic/eui';

import { Content } from '../../../common';
import { useApp } from '../context';

export const SearchContentSection: FC = () => {
  const { rpc } = useApp();
  const [items, setItems] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendSearch = useCallback(async () => {
    setIsLoading(true);

    const { hits } = await rpc.search();
    setItems(hits);

    setIsLoading(false);
  }, [rpc]);

  const columns = [
    {
      field: 'id',
      name: 'Id',
      sortable: false,
      truncateText: false,
    },
    {
      field: 'type',
      name: 'Type',
      sortable: true,
      truncateText: false,
    },
    {
      field: 'title',
      name: 'Title & descr',
      truncateText: true,
      render: (_: string, { title, description }: { title: string; description?: string }) => (
        <p>
          {title}
          <br />
          {description}
        </p>
      ),
    },
    {
      field: 'meta.updatedAt',
      name: 'Last update',
      sortable: true,
      truncateText: false,
    },
  ];

  const renderToolsRight = () => {
    return [
      <EuiButton
        key="refresh"
        onClick={() => {
          sendSearch();
        }}
        isDisabled={isLoading}
      >
        Refresh
      </EuiButton>,
    ];
  };

  const search = {
    toolsRight: renderToolsRight(),
    box: {
      incremental: true,
    },
  };

  useEffect(() => {
    sendSearch();
  }, [sendSearch]);

  return (
    <>
      <EuiTitle>
        <h2>Search</h2>
      </EuiTitle>
      <EuiSpacer />

      <EuiInMemoryTable
        tableCaption="Demo of Content management Search layer"
        items={items}
        itemId="id"
        columns={columns}
        search={search}
        sorting={true}
      />
    </>
  );
};
