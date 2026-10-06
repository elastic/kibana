/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { DetailViewProps } from './types';
import type { Request } from '../../../../../common/adapters/request/types';
export declare function RequestDetailsStats({ request }: DetailViewProps): React.JSX.Element | null;
export declare namespace RequestDetailsStats {
  var shouldShow: (request: Request) => boolean;
}
