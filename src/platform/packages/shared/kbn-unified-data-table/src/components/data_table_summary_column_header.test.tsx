/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
import { mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { UnifiedDataTableSummaryColumnHeader } from './data_table_summary_column_header';
import { EuiIconTip } from '@elastic/eui';
import ColumnHeaderTruncateContainer from './column_header_truncate_container';
import { i18n } from '@kbn/i18n';

describe('UnifiedDataTableSummaryColumnHeader', () => {
  async function mountComponent(element: ReactElement) {
    const component = mountWithI18nProvider(element);
    // Wait a tick for lazy modules or portals inside EuiIconTip
    await new Promise((r) => setTimeout(r, 5));
    component.update();
    return component;
  }

  it('renders column name and default tooltip icon', async () => {
    const component = await mountComponent(
      <UnifiedDataTableSummaryColumnHeader columnDisplayName="My Column" />
    );

    expect(component.text()).toContain('My Column');
    expect(component.find(EuiIconTip).exists()).toBe(true);
    // Default subject attribute is important for functional tests
    expect(component.find('[data-test-subj="unifiedDataTable_headerSummaryIcon"]').exists()).toBe(
      true
    );
  });

  it('applies custom tooltip content and title when provided', async () => {
    const customContent = 'Custom tooltip';
    const customTitle = 'Custom title';
    const component = await mountComponent(
      <UnifiedDataTableSummaryColumnHeader
        columnDisplayName="Column"
        tooltipContent={customContent}
        tooltipTitle={customTitle}
      />
    );

    const icon = component.find(EuiIconTip).first();
    expect(icon.prop('content')).toBe(customContent);
    expect(icon.prop('title')).toBe(customTitle);
  });

  it('renders default column name, tooltip, and passes props correctly when no overrides', async () => {
    const component = await mountComponent(<UnifiedDataTableSummaryColumnHeader />);

    // Default column name (i18n translated "Summary") should be present
    expect(component.text()).toContain(
      i18n.translate('unifiedDataTable.tableHeader.summary', { defaultMessage: 'Summary' })
    );

    const icon = component.find(EuiIconTip).first();
    // Default tooltip content & title
    expect(icon.prop('content')).toBe(
      i18n.translate('unifiedDataTable.tableHeader.sourceFieldIconTooltip', {
        defaultMessage: 'Shows a quick view of the record using its key:value pairs.',
      })
    );
    expect(icon.prop('title')).toBe(
      i18n.translate('unifiedDataTable.tableHeader.sourceFieldIconTooltipTitle', {
        defaultMessage: 'Summary',
      })
    );

    // Default data-test-subj should exist
    expect(component.find('[data-test-subj="unifiedDataTable_headerSummaryIcon"]').exists()).toBe(
      true
    );
  });

  it('passes headerRowHeight and custom data-test-subj props', async () => {
    const component = await mountComponent(
      <UnifiedDataTableSummaryColumnHeader
        headerRowHeight={3}
        iconTipDataTestSubj="customTipSubj"
      />
    );

    // ColumnHeaderTruncateContainer should receive the headerRowHeight prop
    expect(component.find(ColumnHeaderTruncateContainer).prop('headerRowHeight')).toBe(3);

    // Custom data-test-subj should be applied
    expect(component.find('[data-test-subj="customTipSubj"]').exists()).toBe(true);
  });
});
