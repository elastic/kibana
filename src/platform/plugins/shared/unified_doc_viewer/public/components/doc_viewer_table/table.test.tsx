/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { DocViewerTable, SHOW_ONLY_SELECTED_FIELDS } from './table';
import { mockUnifiedDocViewerServices } from '../../__mocks__';
import { setUnifiedDocViewerServices } from '../../plugin';
import { userEvent } from '@testing-library/user-event';

const storage = new Storage(window.localStorage);

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

const dataView = createStubDataView({
  spec: {
    id: 'test',
    title: 'test',
    timeFieldName: '@timestamp',
    fields: {
      '@timestamp': {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        aggregatable: true,
        searchable: true,
        count: 30,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
      bytes: {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        aggregatable: true,
        searchable: true,
        count: 10,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
      'extension.keyword': {
        name: 'extension.keyword',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
        count: 0,
        readFromDocValues: true,
        scripted: false,
        subType: {
          multi: {
            parent: 'extension',
          },
        },
        isMapped: true,
      },
      _id: {
        name: '_id',
        type: 'string',
        esTypes: ['_id'],
        aggregatable: false,
        searchable: true,
        readFromDocValues: true,
        isMapped: true,
      },
    },
  },
});
const hit = buildDataTableRecord(generateEsHits(dataView, 1)[0], dataView);

const setupComponent = (props: Partial<React.ComponentProps<typeof DocViewerTable>> = {}) => {
  const user = userEvent.setup();

  render(
    <IntlProvider locale="en">
      <DocViewerTable dataView={dataView} hit={hit} columns={[]} {...props} />
    </IntlProvider>
  );

  return { user };
};

describe('DocViewerTable', () => {
  afterEach(() => {
    storage.clear();
  });

  describe('table cells', () => {
    it('should render cells', async () => {
      setupComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText(hit.flattened['@timestamp'] as string)).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText(hit.flattened.bytes as string)).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      expect(screen.getByText(hit.flattened['extension.keyword'] as string)).toBeInTheDocument();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      storage.clear();
    });

    it('should find by field name', async () => {
      const { user } = setupComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();

      await user.type(screen.getByTestId('unifiedDocViewerFieldsSearchInput'), 'bytes');

      expect(screen.queryByText('@timestamp')).toBeNull();
      expect(screen.queryByText('bytes')).toBeInTheDocument();
      expect(screen.queryByText('extension.keyword')).toBeNull();
    });

    it('should find by field value', async () => {
      const { user } = setupComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();

      await user.type(
        screen.getByTestId('unifiedDocViewerFieldsSearchInput'),
        String(hit.flattened['extension.keyword'])
      );

      expect(screen.queryByText('@timestamp')).toBeNull();
      expect(screen.queryByText('bytes')).toBeNull();
      expect(screen.queryByText('extension.keyword')).toBeInTheDocument();
    });
  });

  describe('switch - show only selected fields', () => {
    describe('when there is a filter function', () => {
      it('should disable the switch if columns is empty', async () => {
        setupComponent({ filter: jest.fn() });

        expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeDisabled();
        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      });

      it('should disable the switch even if it was previously switched on', async () => {
        storage.set(SHOW_ONLY_SELECTED_FIELDS, true);

        setupComponent({ filter: jest.fn() });

        expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeDisabled();
        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      });

      it('should show only selected fields if it was previously switched on', async () => {
        storage.set(SHOW_ONLY_SELECTED_FIELDS, true);

        setupComponent({ columns: ['extension.keyword'], filter: jest.fn() });

        expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeEnabled();
        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.queryByText('bytes')).toBeNull();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      });

      it('should allow toggling the switch', async () => {
        const { user } = setupComponent({ columns: ['bytes'], filter: jest.fn() });

        const showOnlySelectedFieldsSwitch = screen.getByTestId(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );

        expect(showOnlySelectedFieldsSwitch).toBeEnabled();
        expect(showOnlySelectedFieldsSwitch).toHaveValue('');
        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();

        await user.click(showOnlySelectedFieldsSwitch);

        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.queryByText('extension.keyword')).toBeNull();
        expect(storage.get(SHOW_ONLY_SELECTED_FIELDS)).toBe(true);

        await user.click(showOnlySelectedFieldsSwitch);

        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();
        expect(storage.get(SHOW_ONLY_SELECTED_FIELDS)).toBe(false);
      });
    });

    describe('when there is no filter function', () => {
      it('should not render the switch', () => {
        setupComponent({ columns: ['bytes'] });

        expect(
          screen.queryByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('pinning', () => {
    it('should render pinning controls', async () => {
      setupComponent({ columns: ['bytes'] });

      expect(screen.getByTestId('unifiedDocViewer_pinControl_bytes')).toBeInTheDocument();
      expect(screen.getByTestId('unifiedDocViewer_pinControlButton_bytes')).toBeInTheDocument();
    });

    describe.each([
      {
        from: 'Pin field',
        to: 'Unpin field',
        fieldInitialStatus: 'unpinned',
        before: () => storage.clear(),
      },
      {
        from: 'Unpin field',
        to: 'Pin field',
        fieldInitialStatus: 'pinned',
        before: () => storage.set('discover:pinnedFields', { [dataView.id!]: ['bytes'] }),
      },
    ])('when the field is $fieldInitialStatus', ({ from, to, before }) => {
      beforeEach(() => {
        before();
      });

      afterEach(() => {
        storage.clear();
      });

      describe('when the pinning control is clicked', () => {
        it('should toggle the field', async () => {
          const { user } = setupComponent({ columns: ['bytes'] });

          expect(screen.getByTestId('unifiedDocViewer_pinControlButton_bytes')).toHaveAttribute(
            'aria-label',
            from
          );

          await user.click(screen.getByTestId('unifiedDocViewer_pinControlButton_bytes'));

          expect(screen.getByTestId('unifiedDocViewer_pinControlButton_bytes')).toHaveAttribute(
            'aria-label',
            to
          );
        });

        it('should not focus the toggled field', async () => {
          const { user } = setupComponent({ columns: ['bytes'] });

          expect(screen.getByTestId('unifiedDocViewer_pinControlButton_bytes')).toHaveAttribute(
            'aria-label',
            from
          );

          await user.click(screen.getByTestId('unifiedDocViewer_pinControlButton_bytes'));

          expect(document.activeElement).not.toBe(
            screen
              .getByTestId('unifiedDocViewer_pinControlButton_bytes')
              .closest('[role="gridcell"]')
          );
        });
      });

      describe('when the pinning control is focused and Enter is pressed', () => {
        it('should toggle the field', async () => {
          const { user } = setupComponent({ columns: ['bytes'] });

          const button = screen.getByTestId('unifiedDocViewer_pinControlButton_bytes');
          expect(button).toHaveAttribute('aria-label', from);

          button.focus();
          await user.keyboard('{Enter}');

          expect(screen.getByTestId('unifiedDocViewer_pinControlButton_bytes')).toHaveAttribute(
            'aria-label',
            to
          );
        });

        it('should focus the toggled field', async () => {
          const { user } = setupComponent({ columns: ['bytes'] });

          const button = screen.getByTestId('unifiedDocViewer_pinControlButton_bytes');
          expect(button).toHaveAttribute('aria-label', from);

          button.focus();
          await user.keyboard('{Enter}');

          expect(document.activeElement).toBe(
            screen
              .getByTestId('unifiedDocViewer_pinControlButton_bytes')
              .closest('[role="gridcell"]')
          );
        });
      });
    });
  });
});
