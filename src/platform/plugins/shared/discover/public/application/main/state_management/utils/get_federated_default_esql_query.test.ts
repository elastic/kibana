/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getFederatedDefaultEsqlQuery,
  isGeneratedEsqlDefault,
  isGeneratedOpeningEsql,
  isGeneratedTimeSortedEsql,
} from './get_federated_default_esql_query';

describe('getFederatedDefaultEsqlQuery', () => {
  it('names the dataset when the project has no local or remote indices', () => {
    expect(
      getFederatedDefaultEsqlQuery({
        hasLocalOrRemoteESData: false,
        datasetName: 'btc_blocks',
      })
    ).toBe('FROM btc_blocks');
  });

  it('quotes a dataset name that is not a bare ES|QL source', () => {
    expect(
      getFederatedDefaultEsqlQuery({
        hasLocalOrRemoteESData: false,
        datasetName: 'btc blocks',
      })
    ).toBe('FROM "btc blocks"');
  });

  it('leaves the profile default in place when an index exists', () => {
    expect(
      getFederatedDefaultEsqlQuery({
        hasLocalOrRemoteESData: true,
        datasetName: 'btc_blocks',
      })
    ).toBeUndefined();
  });

  it('leaves the profile default in place when no dataset is registered', () => {
    expect(
      getFederatedDefaultEsqlQuery({
        hasLocalOrRemoteESData: false,
        datasetName: '  ',
      })
    ).toBeUndefined();
  });
});

describe('isGeneratedEsqlDefault', () => {
  const profileQuery = 'FROM logs*,-logstash*,filebeat-*';

  it('matches the profile query and the same query with the data view time sort', () => {
    expect(isGeneratedEsqlDefault(profileQuery, profileQuery)).toBe(true);
    expect(isGeneratedEsqlDefault(`${profileQuery} | SORT @timestamp DESC`, profileQuery)).toBe(
      true
    );
  });

  it('does not match a query the user wrote', () => {
    expect(isGeneratedEsqlDefault('FROM btc_blocks | STATS COUNT(*)', profileQuery)).toBe(false);
    expect(isGeneratedEsqlDefault(undefined, profileQuery)).toBe(false);
  });
});

describe('isGeneratedTimeSortedEsql', () => {
  it('matches the logs default after the data view adds its time sort', () => {
    expect(
      isGeneratedTimeSortedEsql('FROM logs*,-logstash*,filebeat-* | SORT @timestamp DESC')
    ).toBe(true);
  });

  it('does not match a query that only starts with FROM', () => {
    expect(isGeneratedTimeSortedEsql('FROM btc_blocks | STATS COUNT(*)')).toBe(false);
  });
});

describe('isGeneratedOpeningEsql', () => {
  it('matches the default query of each solution', () => {
    expect(isGeneratedOpeningEsql('FROM logs*,-logstash*,filebeat-*')).toBe(true);
    expect(
      isGeneratedOpeningEsql('FROM .alerts-security.alerts-security,logs-* | SORT @timestamp DESC')
    ).toBe(true);
    expect(
      isGeneratedOpeningEsql(
        'FROM .workflows-executions-data-stream,.workflows-executions | SORT startedAt DESC | WHERE startedAt >= ?_tstart AND startedAt <= ?_tend'
      )
    ).toBe(true);
  });

  it('does not match a query the user wrote', () => {
    expect(isGeneratedOpeningEsql('FROM btc_blocks | STATS COUNT(*)')).toBe(false);
  });
});
