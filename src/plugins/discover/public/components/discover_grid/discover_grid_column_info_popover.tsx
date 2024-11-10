/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { RenderCustomGridColumnInfoPopover } from '@kbn/unified-data-table';
import {
  UnifiedFieldListItemPopover,
  type UnifiedFieldListItemPopoverProps,
} from '@kbn/unified-field-list';
import { DataViewField } from '@kbn/data-plugin/common';
import { useEuiTheme, EuiButtonIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { PLUGIN_ID } from '../../../common';
import { DiscoverServices } from '../../build_services';

const options = {
  originatingApp: PLUGIN_ID,
};

export const getDiscoverGridColumnInfoPopover =
  ({
    isEsqlMode,
    services,
    queryAndFiltersOverride,
  }: {
    isEsqlMode: boolean;
    services: DiscoverServices;
    queryAndFiltersOverride?: UnifiedFieldListItemPopoverProps['queryAndFiltersOverride'];
  }): RenderCustomGridColumnInfoPopover =>
  ({ dataView, columnName, columnsMeta }) => {
    const { euiTheme } = useEuiTheme();
    const field = useMemo(() => {
      if (columnsMeta) {
        if (!columnsMeta[columnName]) {
          return null;
        }

        return new DataViewField(
          convertDatatableColumnToDataViewFieldSpec({
            id: columnName,
            name: columnName,
            meta: columnsMeta[columnName],
          })
        );
      }

      return dataView?.fields.getByName(columnName);
    }, [dataView, columnName, columnsMeta]);

    if (columnName === '_source') {
      return null;
    }

    if (!field) {
      return null;
    }

    return (
      <span
        css={css`
          display: inline-block;
          width: ${euiTheme.size.base};
          line-height: ${euiTheme.size.base};
          margin-right: ${euiTheme.size.xs};
        `}
      >
        <UnifiedFieldListItemPopover
          ButtonComponent={InfoButton}
          options={options}
          field={field}
          dataView={dataView}
          services={services}
          queryAndFiltersOverride={queryAndFiltersOverride}
          popoverAnchorPosition="downCenter"
          onAddFilter={undefined} // TODO
          size="s" // TODO: make the following props optional
          itemIndex={0}
          groupIndex={0}
          isEmpty={false}
          isSelected={true}
          onAddFieldToWorkspace={() => {}}
          onRemoveFieldFromWorkspace={() => {}}
          searchMode={isEsqlMode ? 'text-based' : 'documents'}
        />
      </span>
    );
  };

function InfoButton({ onTogglePopover }: { onTogglePopover: () => void }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiButtonIcon
      iconType="iInCircle"
      color="text"
      size="xs"
      aria-label={i18n.translate('discover.dataGrid.columnInfoPopoverButtonAriaLabel', {
        defaultMessage: 'Open column info popover',
      })}
      css={css`
        block-size: ${euiTheme.size.base};
      `}
      onClick={onTogglePopover}
    />
  );
}
