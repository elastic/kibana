/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueBoxed } from '../../../../../expressions/common';
import { ExpressionValueVisDimension } from '../../../../../visualizations/common';
import { LogBase } from '../constants';

interface XDomainBase {
  minInterval?: number;
}

type XDomainCommon = {
  intervalUnit?: string;
  intervalValue?: number;
  timezone?: string;
  considerInterval?: boolean;
  column?: ExpressionValueVisDimension;
} & Partial<XDomainMin> &
  Partial<XDomainMax> &
  XDomainBase;

interface XDomainMin {
  min: number;
}

interface XDomainMax {
  max: number;
}

interface XDomainLogScale {
  logBase?: LogBase;
}

interface XDomainPlain {
  coordinates?: Array<number | string>;
}

type XDomainArgs = (
  | XDomainCommon
  | (XDomainCommon & XDomainMin)
  | (XDomainCommon & XDomainMax)
  | (XDomainCommon & XDomainMin & XDomainMax)
) &
  XDomainLogScale &
  XDomainPlain;

interface AdjustedXDomain {
  adjusted?: XDomainBase & Partial<XDomainMin> & Partial<XDomainMax>;
}

export type XDomainArguments = XDomainArgs;

export type XDomainOutput = XDomainBase &
  Partial<XDomainMin> &
  Partial<XDomainMax> &
  XDomainLogScale &
  XDomainPlain &
  AdjustedXDomain;

export type ExpressionValueXDomain = ExpressionValueBoxed<'x_domain', XDomainOutput>;
