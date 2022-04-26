/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useEuiTour, EuiStatelessTourStep, EuiTourState } from '@elastic/eui';

const tourSteps = [
  {
    step: 1,
    title: i18n.translate('discover.docExplorerTour.stepAddFieldsTitle', {
      defaultMessage: 'Add fields to the table',
    }),
    content: (
      <p>
        <FormattedMessage
          id="discover.docExplorerTour.stepAddFieldsDescription"
          defaultMessage="Add the fields relevant to you, then drag the columns to your preferred order."
        />
      </p>
    ),
  },
  {
    step: 2,
    title: i18n.translate('discover.docExplorerTour.stepSortFieldsTitle', {
      defaultMessage: 'Sort on multiple fields',
    }),
    content: (
      <p>
        <FormattedMessage
          id="discover.docExplorerTour.stepSortFieldsDescription"
          defaultMessage="Find all your sorting needs in the fields sorted pop-up. Reorder the sort using drag and drop."
        />
      </p>
    ),
  },
  {
    step: 3,
    title: i18n.translate('discover.docExplorerTour.stepChangeRowHeightTitle', {
      defaultMessage: 'Change the row height',
    }),
    content: (
      <p>
        <FormattedMessage
          id="discover.docExplorerTour.stepChangeRowHeightDescription"
          defaultMessage="Specify the number of lines per row, or automatically adjust the height to fit the contents."
        />
      </p>
    ),
  },
  {
    step: 4,
    title: i18n.translate('discover.docExplorerTour.stepExpandTitle', {
      defaultMessage: 'Expand and compare',
    }),
    content: (
      <p>
        <FormattedMessage
          id="discover.docExplorerTour.stepExpandDescription"
          defaultMessage="Expand a document to inspect its fields, set filters, and view the documents before and after. Interested in specific documents only? Select them, and then use the selected documents dropdown."
        />
      </p>
    ),
  },
] as EuiStatelessTourStep[];

const tourConfig: EuiTourState = {
  currentTourStep: 1,
  isTourActive: true,
  tourPopoverWidth: 350,
  tourSubtitle: 'Demo tour',
};

export const DocumentExplorerTour = () => {
  const [steps, actions, reducerState] = useEuiTour(tourSteps, tourConfig);

  const onReset = useCallback(() => {
    actions.resetTour();
  }, [actions]);
};
