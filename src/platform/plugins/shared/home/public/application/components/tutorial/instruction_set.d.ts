/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
import type * as StatusCheckStates from './status_check_states';
import type { InstructionSetType } from '../../../services/tutorials/types';
interface InstructionSetProps extends InstructionSetType {
  instructionVariants: InstructionSetType['instructionVariants'];
  statusCheckConfig: InstructionSetType['statusCheck'];
  statusCheckState: keyof typeof StatusCheckStates;
  onStatusCheck: () => void;
  offset: number;
  replaceTemplateStrings: (text: string) => string;
  isCloudEnabled: boolean;
  intl: InjectedIntl;
}
export declare const InstructionSet: React.FC<
  import('react-intl').WithIntlProps<InstructionSetProps>
> & {
  WrappedComponent: React.ComponentType<InstructionSetProps>;
};
export {};
