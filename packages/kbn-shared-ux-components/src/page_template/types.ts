/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPageTemplateProps } from '@elastic/eui';
import { NoDataPageProps } from './no_data_page';
import { KibanaPageTemplateSolutionNavProps } from './solution_nav';

export type KibanaPageTemplateProps = EuiPageTemplateProps & {
  /**
   * Changes the template type depending on other props provided.
   * With `pageHeader` only: Uses `centeredBody` and fills an EuiEmptyPrompt with `pageHeader` info.
   * With `children` only: Uses `centeredBody`
   * With `pageHeader` and `children`: Uses `centeredContent`
   */
  isEmptyState?: boolean;
  /**
   * Quick creation of EuiSideNav. Hooks up mobile instance too
   */
  solutionNav?: KibanaPageTemplateSolutionNavProps;
  /**
   * Accepts a configuration object, that when provided, ignores pageHeader and children and instead
   * displays Agent, Beats, and custom cards to direct users to the right ingest location
   */
  noDataConfig?: NoDataPageProps;
};
