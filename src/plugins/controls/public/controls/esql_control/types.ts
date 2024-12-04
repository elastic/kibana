/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { PublishesPanelTitle, PublishingSubject } from '@kbn/presentation-publishing';
import type { ESQLControlState as ControlState } from '@kbn/esql/public';
import type { DefaultControlState } from '../../../common';
import type { DefaultControlApi } from '../types';

interface PublishesSelectedOptions {
  selectedOptions$: PublishingSubject<string[]>;
}

export interface ESQLControlState
  extends DefaultControlState,
    Omit<ControlState, 'width' | 'title'> {}

export type ESQLControlApi = DefaultControlApi &
  Pick<PublishesPanelTitle, 'defaultPanelTitle'> &
  PublishesSelectedOptions;
