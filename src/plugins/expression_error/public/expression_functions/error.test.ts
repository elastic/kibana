/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper, elasticOutline, elasticLogo } from '../../../presentation_util/public';
import { getFunctionErrors } from '../../common/i18n';
import { revealImageFunction } from './reveal_image_function';
import { Origin } from '../../common/types/expression_functions';
import { ExecutionContext } from 'src/plugins/expressions';

const errors = getFunctionErrors().revealImage;
