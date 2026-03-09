/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { SignatureState, FunctionParameterContext } from './types';

export {
  getParamAtPosition,
  getParamDefsAtPosition,
  getMaxMinNumberOfParams,
} from './arity';

export {
  argMatchesParamType,
  getMatchingSignatures,
  PARAM_TYPES_THAT_SUPPORT_IMPLICIT_STRING_CASTING,
  pairKeywordAndTextTypes,
} from './matchers';

export {
  areParamsHomogeneous,
  hasVariadicSignature,
  hasRepeatingSignature,
  hasArbitraryExpressionSignature,
  hasBooleanSignature,
} from './traits';

export {
  isAtRepeatingValuePosition,
  isAmbiguousPosition,
  canAcceptMoreArgs,
  isCurrentTypeCompatible,
  doesParamAcceptType,
  getCompatibleParamDefs,
  getAcceptedParamTypes,
  isTypeAcceptedAtPosition,
  toSignatureState,
  extractSignatureMapParams,
} from './signature_analyzer';
