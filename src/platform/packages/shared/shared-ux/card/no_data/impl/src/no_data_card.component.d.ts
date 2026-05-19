/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { NoDataCardComponentProps as Props } from '@kbn/shared-ux-card-no-data-types';
export declare const NO_DATA_CARD_MAX_WIDTH = 400;
export declare const NoDataCard: ({
  title,
  description,
  canAccessFleet,
  href,
  buttonText,
  buttonIsDisabled,
  disabledButtonTooltipText,
  docsLink: link,
  onClick,
  icon,
  'data-test-subj': dataTestSubj,
}: Props) => React.JSX.Element;
