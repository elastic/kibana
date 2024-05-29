/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

const ACTION_UPDATE_ESQL_QUERY = 'ACTION_UPDATE_ESQL_QUERY';

interface Context {
  embeddable: IEmbeddable;
  queryString: string;
}

export const getHelpersAsync = async () => await import('./update_ESQL_query_helpers');

export class UpdateESQLQueryAction implements Action<Context> {
  public type = ACTION_UPDATE_ESQL_QUERY;
  public id = ACTION_UPDATE_ESQL_QUERY;
  public order = 50;

  constructor(protected readonly data: DataPublicPluginStart) {}

  public getDisplayName({ embeddable }: Context): string {
    return i18n.translate('textBasedLanguages.updateESQLQueryLabel', {
      defaultMessage: 'Update the ES|QL query in the editor',
    });
  }

  public getIconType() {
    return 'filter';
  }

  public async isCompatible({ embeddable }: Context) {
    const { isActionCompatible } = await getHelpersAsync();
    return isActionCompatible(this.data);
  }

  public async execute({ embeddable, queryString }: Context) {
    const { executeAction } = await getHelpersAsync();
    return executeAction({
      embeddable,
      queryString,
      data: this.data,
    });
  }
}
