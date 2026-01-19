/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { isActionCompatible, executeAction } from './update_esql_query_helpers';
import { ACTION_UPDATE_ESQL_QUERY } from '../constants';

interface Context {
  queryString: string;
}

export class UpdateESQLQueryAction implements Action<Context> {
  public type = ACTION_UPDATE_ESQL_QUERY;
  public id = ACTION_UPDATE_ESQL_QUERY;
  public order = 50;

  constructor(protected readonly data: DataPublicPluginStart) {}

  public getDisplayName(): string {
    return i18n.translate('esql.updateESQLQueryLabel', {
      defaultMessage: 'Update the ES|QL query in the editor',
    });
  }

  public getIconType() {
    return 'filter';
  }

  public async isCompatible() {
    return isActionCompatible(this.data);
  }

  public async execute({ queryString }: Context) {
    return executeAction({
      queryString,
      data: this.data,
    });
  }
}
