/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { PureComponent } from 'react';
import { EuiFlexItem, EuiToolTip, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DragHandleProps } from '../../types';

interface SeriesDragHandlerProps {
  hideDragHandler: boolean;
  dragHandleProps: DragHandleProps;
}

export class SeriesDragHandler extends PureComponent<SeriesDragHandlerProps> {
  static defaultProps = {
    hideDragHandler: true,
  };

  render() {
    const { dragHandleProps, hideDragHandler } = this.props;

    return (
      <EuiFlexItem grow={false}>
        <div {...dragHandleProps}>
          {!hideDragHandler && (
            <EuiToolTip
              content={i18n.translate('visTypeTimeseries.sort.dragToSortTooltip', {
                defaultMessage: 'Drag to sort',
              })}
            >
              <EuiIcon
                className="tvbSeries__sortHandle"
                aria-label={i18n.translate('visTypeTimeseries.sort.dragToSortAriaLabel', {
                  defaultMessage: 'Drag to sort',
                })}
                type="grab"
              />
            </EuiToolTip>
          )}
        </div>
      </EuiFlexItem>
    );
  }
}
