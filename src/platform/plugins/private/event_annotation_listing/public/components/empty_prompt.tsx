/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ContentListEmptyState } from '@kbn/content-list';
import { FormattedMessage } from '@kbn/i18n-react';

export interface EmptyPromptProps {
  /**
   * Invoked when the user clicks the call-to-action button. Typically used to
   * route the user into the Lens editor where annotation groups are created.
   */
  onCreateClick: () => void;
}

/**
 * Empty-state shown by the annotation library listing when no groups exist.
 * Rendered inside `ContentList`'s `emptyState` slot. Thin wrapper around
 * `ContentListEmptyState` that injects the Lens-specific copy and CTA so the
 * existing translation IDs are preserved.
 */
export const EmptyPrompt = ({ onCreateClick }: EmptyPromptProps) => (
  <ContentListEmptyState
    iconType="flag"
    title={
      <h2>
        <FormattedMessage
          id="eventAnnotationListing.tableList.emptyPrompt.title"
          defaultMessage="Create your first annotation in Lens"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="eventAnnotationListing.tableList.emptyPrompt.body"
          defaultMessage="You can create and save annotations for use across multiple visualizations in the Lens editor."
        />
      </p>
    }
    primaryAction={{
      label: (
        <FormattedMessage
          id="eventAnnotationListing.tableList.emptyPrompt.cta"
          defaultMessage="Create annotation in Lens"
        />
      ),
      onClick: onCreateClick,
      iconType: 'lensApp',
    }}
  />
);
