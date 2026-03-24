/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createEvent, fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DiscoverEsqlLink } from '.';
import { useDiscoverLinkAndEsqlQuery } from '../../../../../hooks/use_discover_link_and_esql_query';
import { useDocViewerExtensionActionsContext } from '../../../../../hooks/use_doc_viewer_extension_actions';

jest.mock('../../../../../hooks/use_discover_link_and_esql_query', () => ({
  useDiscoverLinkAndEsqlQuery: jest.fn(),
}));

jest.mock('../../../../../hooks/use_doc_viewer_extension_actions', () => ({
  useDocViewerExtensionActionsContext: jest.fn(),
}));

describe('DiscoverEsqlLink', () => {
  const indexPattern = 'apm-*';
  const whereClause = undefined;
  const tabLabel = 'Tab label';
  const dataTestSubj = 'discoverEsqlLink';

  beforeEach(() => {
    jest.clearAllMocks();
    (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue(undefined);
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: undefined,
      esqlQueryString: undefined,
    });
  });

  it('renders children without a link when href and openInNewTab are unavailable', () => {
    const { getByText, queryByTestId } = render(
      <DiscoverEsqlLink
        indexPattern={indexPattern}
        whereClause={whereClause}
        tabLabel={tabLabel}
        dataTestSubj={dataTestSubj}
      >
        Child
      </DiscoverEsqlLink>
    );

    expect(getByText('Child')).toBeInTheDocument();
    expect(queryByTestId(dataTestSubj)).not.toBeInTheDocument();
  });

  it('renders a link when discoverUrl is available', () => {
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: '/app/discover#/?_a=1',
      esqlQueryString: undefined,
    });

    const { getByTestId } = render(
      <DiscoverEsqlLink
        indexPattern={indexPattern}
        whereClause={whereClause}
        tabLabel={tabLabel}
        dataTestSubj={dataTestSubj}
      >
        Child
      </DiscoverEsqlLink>
    );

    expect(getByTestId(dataTestSubj)).toHaveAttribute('href', '/app/discover#/?_a=1');
  });

  it('calls openInNewTab on plain left click when esqlQueryString is available', () => {
    const openInNewTab = jest.fn();
    (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue({ openInNewTab });
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: '/app/discover#/?_a=1',
      esqlQueryString: 'FROM apm-* | WHERE true',
    });

    const { getByTestId } = render(
      <DiscoverEsqlLink
        indexPattern={indexPattern}
        whereClause={whereClause}
        tabLabel={tabLabel}
        dataTestSubj={dataTestSubj}
      >
        Child
      </DiscoverEsqlLink>
    );

    const link = getByTestId(dataTestSubj);
    const clickEvent = createEvent.click(link, { button: 0 });
    fireEvent(link, clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(openInNewTab).toHaveBeenCalledWith({
      query: { esql: 'FROM apm-* | WHERE true' },
      tabLabel,
    });
  });

  it('does not intercept modifier clicks when href is present', () => {
    const openInNewTab = jest.fn();
    (useDocViewerExtensionActionsContext as jest.Mock).mockReturnValue({ openInNewTab });
    (useDiscoverLinkAndEsqlQuery as jest.Mock).mockReturnValue({
      discoverUrl: '/app/discover#/?_a=1',
      esqlQueryString: 'FROM apm-* | WHERE true',
    });

    const { getByTestId } = render(
      <DiscoverEsqlLink
        indexPattern={indexPattern}
        whereClause={whereClause}
        tabLabel={tabLabel}
        dataTestSubj={dataTestSubj}
      >
        Child
      </DiscoverEsqlLink>
    );

    const link = getByTestId(dataTestSubj);
    const ctrlClickEvent = createEvent.click(link, { button: 0, ctrlKey: true });
    fireEvent(link, ctrlClickEvent);

    expect(openInNewTab).not.toHaveBeenCalled();
    expect(ctrlClickEvent.defaultPrevented).toBe(false);
  });
});
