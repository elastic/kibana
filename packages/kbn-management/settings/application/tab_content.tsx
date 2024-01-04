/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiCallOut, EuiSpacer, Query } from '@elastic/eui';
import { Form } from '@kbn/management-settings-components-form';
import { EmptyState } from './empty_state';
import { i18nTexts } from './i18n_texts';

/**
 * Props for a {@link TabContent} component.
 */
export interface TabContentProps {
  /** Specifies whether the tab content should display global settings. */
  isGlobal: boolean;
  fields: any;
  query: Query;
  onClearQuery: () => void;
  categoryCounts: any;
  /** Specifies whether the tab callout should be displayed. */
  callOutEnabled: boolean;
}

/**
 * Component for displaying the tab content that contains the {@link Form } for the settings in the specified scope.
 */
export const TabContent = (props: TabContentProps) => {
  const { isGlobal, fields, query, onClearQuery, callOutEnabled, categoryCounts } = props;

  const callOutTitle = isGlobal ? i18nTexts.globalCalloutTitle : i18nTexts.defaultSpaceCalloutTitle;
  const callOutText = isGlobal
    ? i18nTexts.globalCalloutSubtitle
    : i18nTexts.defaultSpaceCalloutSubtitle;

  return (
    <>
      {callOutEnabled && (
        <>
          <EuiSpacer size="xl" />
          <EuiCallOut title={callOutTitle} iconType="warning">
            <p>{callOutText}</p>
          </EuiCallOut>
        </>
      )}
      <EuiSpacer size="xl" />
      {fields.length ? (
        <Form
          fields={fields}
          categoryCounts={categoryCounts}
          isSavingEnabled={true}
          onClearQuery={onClearQuery}
        />
      ) : (
        <EmptyState {...{ queryText: query?.text, onClearQuery }} />
      )}
    </>
  );
};
