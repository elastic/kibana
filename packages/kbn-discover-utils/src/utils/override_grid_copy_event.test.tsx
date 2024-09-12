/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ClipboardEvent } from 'react';
import { screen, render } from '@testing-library/react';
import { overrideGridCopyEvent } from './override_grid_copy_event';

describe('overrideGridCopyEvent', () => {
  it('should override the default copy action for a selected text in grid', async () => {
    render(
      <div data-test-subj="grid">
        <div role="row" className="euiDataGridHeader">
          <div role="columnheader">
            <div className="euiDataGridHeaderCell__content">
              @timestamp
              <div className="euiIcon">Icon</div>
            </div>
            <div>other elements</div>
          </div>
          <div role="columnheader">
            <div>other elements</div>
            <div className="euiDataGridHeaderCell__content">extension</div>
          </div>
        </div>
        <div role="row">
          <div role="gridcell">
            <div className="euiDataGridRowCell__content">
              Sep 12, 2024 @ 10:08:49.615
              <div className="euiToken">Token</div>
            </div>
            <div>other elements</div>
          </div>
          <div role="gridcell">
            <div className="euiDataGridRowCell__content">zip</div>
            <div>other elements</div>
          </div>
        </div>
        <div role="row">
          <div role="gridcell">
            <div className="euiDataGridRowCell__content">Sep 12, 2024 @ 14:08:49.615</div>
            <div>other elements</div>
          </div>
          <div role="gridcell">
            <div className="euiDataGridRowCell__content">
              <img src="https://test.com/zip" alt="" />
            </div>
            <div>other elements</div>
          </div>
        </div>
        <div role="row">
          <div role="gridcell" className="euiDataGridRowCell--controlColumn">
            <div className="euiDataGridRowCell__content">test</div>
          </div>
          <div role="gridcell">
            <div className="euiDataGridRowCell__content">Sep 12, 2024 @ 15:08:49.615</div>
          </div>
          <div role="gridcell">
            <div className="euiDataGridRowCell__content">
              <dl
                className="euiDescriptionList unifiedDataTable__descriptionList unifiedDataTable__cellValue css-id58dh-euiDescriptionList-inline-left"
                data-test-subj="discoverCellDescriptionList"
              >
                <dt className="euiDescriptionList__title unifiedDataTable__descriptionListTitle css-1fizlic-euiDescriptionList__title-inline-compressed">
                  @timestamp
                </dt>
                <dd className="euiDescriptionList__description unifiedDataTable__descriptionListDescription css-11rdew2-euiDescriptionList__description-inline-compressed">
                  Sep 12, 2024 @ 10:08:49.615
                </dd>
                <dt className="euiDescriptionList__title unifiedDataTable__descriptionListTitle css-1fizlic-euiDescriptionList__title-inline-compressed">
                  bytes
                </dt>
                <dd className="euiDescriptionList__description unifiedDataTable__descriptionListDescription css-11rdew2-euiDescriptionList__description-inline-compressed">
                  7,490
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );

    const dataGridWrapper = await screen.getByTestId('grid');

    const selection = global.window.getSelection();
    const range = document.createRange();
    range.selectNode(dataGridWrapper);
    selection!.removeAllRanges();
    selection!.addRange(range);

    const copyEvent = {
      preventDefault: jest.fn(),
      clipboardData: {
        setData: jest.fn(),
      },
    };

    overrideGridCopyEvent({
      event: copyEvent as unknown as ClipboardEvent<HTMLDivElement>,
      dataGridWrapper,
    });

    expect(copyEvent.preventDefault).toHaveBeenCalled();
    expect(copyEvent.clipboardData.setData).toHaveBeenCalledWith(
      'text/plain',
      '@timestamp\textension\n' +
        'Sep 12, 2024 @ 10:08:49.615\tzip\n' +
        'Sep 12, 2024 @ 14:08:49.615\thttps://test.com/zip\n' +
        'Sep 12, 2024 @ 15:08:49.615\t@timestamp: Sep 12, 2024 @ 10:08:49.615, bytes: 7,490\n'
    );
  });
});
