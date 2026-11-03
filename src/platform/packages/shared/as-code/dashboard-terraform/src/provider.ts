/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// 0.16.6 was the latest release when the mapping was compared with provider main at dde805511b27; a real
// `terraform plan` against it is still to run (tf-export 14). Bump with the provider's CI check, never on its own.
/** The provider version this Kibana's mapping targets; exports require `>=` it. */
export const TERRAFORM_PROVIDER = { source: 'elastic/elasticstack', version: '0.16.6' } as const;

/** The provider resource a dashboard is exported as. */
export const DASHBOARD_RESOURCE_TYPE = 'elasticstack_kibana_dashboard';

/** The tag resource type and the oldest Kibana Terraform can apply it to; update with `TERRAFORM_PROVIDER`. */
export const TAG_RESOURCE = { type: 'elasticstack_kibana_tag', minKibanaVersion: '9.5.0' } as const;

/** The data view resource type; the schemas' `tfDataViewRef()` names the same one. */
export const DATA_VIEW_RESOURCE_TYPE = 'elasticstack_kibana_data_view';
