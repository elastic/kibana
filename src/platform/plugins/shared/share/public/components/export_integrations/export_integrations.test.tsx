/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { ExportMenu } from './export_integrations';
import type { IShareContext } from '../context';
import type { ExportShareConfig, ShareConfigs } from '../../types';

const mockShareContext: IShareContext = {
  shareMenuItems: [
    {
      shareType: 'integration',
      groupId: 'export',
      id: 'csv',
      config: {
        icon: 'empty',
        label: 'CSV',
      },
    },
    {
      shareType: 'integration',
      groupId: 'export',
      id: 'png',
      config: {
        icon: 'empty',
        label: 'PNG',
      },
    },
  ],
  allowShortUrl: true,
  objectTypeMeta: {
    title: 'title',
    config: {
      embed: {
        disabled: false,
      },
    },
  },
  objectType: 'type',
  sharingData: { title: 'title', url: 'url' },
  isDirty: false,
  onClose: jest.fn(),
};

function ExportPopoverRender({
  shareContext = mockShareContext,
}: {
  shareContext?: IShareContext;
}) {
  const [clickTarget, setClickTarget] = React.useState<HTMLElement | null>();

  return (
    <IntlProvider locale="en">
      {Boolean(clickTarget) && (
        <ExportMenu
          shareContext={{
            ...shareContext,
            anchorElement: clickTarget!,
          }}
        />
      )}
      <div ref={setClickTarget}>click me</div>
    </IntlProvider>
  );
}

describe('Export Integrations', () => {
  it('renders a popover with the list of registered export types', async () => {
    const user = userEvent.setup();

    render(<ExportPopoverRender />);

    await user.click(screen.getByText('click me'));

    await waitForEuiPopoverOpen();

    ['CSV', 'PNG'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  describe('Export Derivatives', () => {
    const exportDerivativeLabel = 'Export derivative';
    const getMockExportDerivativeConfig = (shouldRender: boolean): ShareConfigs => ({
      shareType: 'integration',
      groupId: 'exportDerivatives',
      id: 'anExampleExportDerivative',
      config: {
        shouldRender: () => shouldRender,
        label: () => <span>{exportDerivativeLabel}</span>,
        flyoutContent: () => <div />,
        icon: 'empty',
      },
    });

    it('render export derivatives with passing shouldRender predicates', async () => {
      const user = userEvent.setup();

      render(
        <ExportPopoverRender
          shareContext={{
            ...mockShareContext,
            shareMenuItems: [
              ...mockShareContext.shareMenuItems,
              getMockExportDerivativeConfig(true),
            ],
          }}
        />
      );

      await user.click(screen.getByText('click me'));

      await waitForEuiPopoverOpen();

      expect(screen.getByText(exportDerivativeLabel)).toBeInTheDocument();
    });

    it('does not render export derivatives with non-passing shouldRender predicates', async () => {
      const user = userEvent.setup();
      const label = 'Export derivative';

      render(
        <ExportPopoverRender
          shareContext={{
            ...mockShareContext,
            shareMenuItems: [
              ...mockShareContext.shareMenuItems,
              getMockExportDerivativeConfig(false),
            ],
          }}
        />
      );

      await user.click(screen.getByText('click me'));

      await waitForEuiPopoverOpen();

      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
  });

  it('will invoke the export integrations generateAssetExport config method if it is the singular export type available', async () => {
    const user = userEvent.setup();

    const singleExportShareContext: IShareContext = {
      ...mockShareContext,
      shareMenuItems: [
        {
          shareType: 'integration',
          groupId: 'export',
          id: 'csv',
          config: {
            icon: 'empty',
            label: 'CSV',
            generateAssetExport: jest.fn(() => Promise.resolve()),
          },
        } as unknown as ExportShareConfig,
      ],
    };

    render(<ExportPopoverRender shareContext={singleExportShareContext} />);

    await user.click(screen.getByText('click me'));

    expect(
      (singleExportShareContext.shareMenuItems[0] as ExportShareConfig).config.generateAssetExport
    ).toHaveBeenCalled();
    expect(singleExportShareContext.onClose).toHaveBeenCalled();
  });
});
