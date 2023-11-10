/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CSV_JOB_TYPE, CSV_JOB_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import { PDF_JOB_TYPE, PDF_JOB_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_JOB_TYPE, PNG_JOB_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

export const jobTypes = [
  CSV_JOB_TYPE,
  CSV_JOB_TYPE_V2,
  PNG_JOB_TYPE,
  PNG_JOB_TYPE_V2,
  PDF_JOB_TYPE,
  PDF_JOB_TYPE_V2,
];
