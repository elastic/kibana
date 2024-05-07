/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationPanelProps } from '@kbn/presentation-panel-plugin/public';
import { MaybePromise } from '@kbn/utility-types';
import { ReactNode } from 'react';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../lib';

export type LegacyCompatibleEmbeddable = IEmbeddable<
  EmbeddableInput,
  EmbeddableOutput,
  MaybePromise<ReactNode>
>;

export type EmbeddablePanelProps = Omit<PresentationPanelProps, 'Component'> & {
  embeddable: LegacyCompatibleEmbeddable | (() => Promise<LegacyCompatibleEmbeddable>);
};

export type UnwrappedEmbeddablePanelProps = Omit<EmbeddablePanelProps, 'embeddable'> & {
  embeddable: LegacyCompatibleEmbeddable;
};
