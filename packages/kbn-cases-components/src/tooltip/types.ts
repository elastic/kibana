/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CaseStatuses } from '../status/types';
export interface CaseTooltipContentProps {
  title: string;
  description: string;
  status: CaseStatuses;
  totalComments: number;
  createdAt: string;
  createdBy: { username?: string; fullName?: string };
}

export interface CaseTooltipProps {
  children: React.ReactNode;
  content: CaseTooltipContentProps;
  dataTestSubj?: string;
  className?: string;
  loading?: boolean;
}
