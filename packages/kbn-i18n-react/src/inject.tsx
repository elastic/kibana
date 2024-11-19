/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Higher-Order Component is used for injecting intl prop into wrapped
 * component and encapsulate direct work with React context.
 * More docs and examples can be found here https://github.com/yahoo/react-intl/wiki/API#injection-api
 */

export { injectIntl as injectI18n, useIntl as useI18n } from 'react-intl';
