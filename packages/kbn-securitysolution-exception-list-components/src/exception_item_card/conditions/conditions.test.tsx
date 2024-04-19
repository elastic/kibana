/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { ExceptionItemCardConditions } from '.';
import { MockedShowValueListModal } from '../../mocks/value_list_modal.mock';

interface TestEntry {
  field: string;
  operator: 'included' | 'excluded';
  type: unknown;
  value?: string | string[];
  entries?: TestEntry[];
  list?: { id: string; type: string };
}
const getEntryKey = (
  entry: TestEntry,
  index: string,
  list?: { id: string; type: string } | null
) => {
  if (list && Object.keys(list)) {
    const { field, type, list: entryList } = entry;
    const { id } = entryList || {};
    return `${field}${type}${id || ''}${index}`;
  }
  const { field, type, value } = entry;
  return `${field}${type}${value || ''}${index}`;
};

describe('ExceptionItemCardConditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });
  it('it includes os condition if one exists', () => {
    const entries: TestEntry[] = [
      {
        field: 'host.name',
        operator: 'included',
        type: 'match',
        value: 'host',
      },
      {
        field: 'threat.indicator.port',
        operator: 'included',
        type: 'exists',
      },
      {
        entries: [
          {
            field: 'valid',
            operator: 'included',
            type: 'match',
            value: 'true',
          },
        ],
        field: 'file.Ext.code_signature',
        type: 'nested',
        operator: 'included',
      },
    ];
    const wrapper = render(
      <ExceptionItemCardConditions
        os={['linux']}
        entries={[
          {
            field: 'host.name',
            operator: 'included',
            type: 'match',
            value: 'host',
          },
          {
            field: 'threat.indicator.port',
            operator: 'included',
            type: 'exists',
          },
          {
            entries: [
              {
                field: 'valid',
                operator: 'included',
                type: 'match',
                value: 'true',
              },
            ],
            field: 'file.Ext.code_signature',
            type: 'nested',
          },
        ]}
        dataTestSubj="exceptionItemConditions"
        showValueListModal={MockedShowValueListModal}
      />
    );
    expect(wrapper.getByTestId('exceptionItemConditionsOs')).toHaveTextContent('OSIS Linux');

    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[0], '0')}EntryContent`)
    ).toHaveTextContent('host.nameIS host');

    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[1], '1')}EntryContent`)
    ).toHaveTextContent('AND threat.indicator.portexists');

    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[2], '2')}EntryContent`)
    ).toHaveTextContent('AND file.Ext.code_signature');

    if (entries[2] && entries[2].entries) {
      expect(
        wrapper.getByTestId(
          `exceptionItemConditions${getEntryKey(entries[2].entries[0], '0')}EntryContent`
        )
      ).toHaveTextContent('validIS true');
    }
  });

  it('it renders item conditions', () => {
    const entries: TestEntry[] = [
      {
        field: 'host.name',
        operator: 'included',
        type: 'match',
        value: 'host',
      },
      {
        field: 'host.name',
        operator: 'excluded',
        type: 'match',
        value: 'host',
      },
      {
        field: 'host.name',
        operator: 'included',
        type: 'match_any',
        value: ['foo', 'bar'],
      },
      {
        field: 'host.name',
        operator: 'excluded',
        type: 'match_any',
        value: ['foo', 'bar'],
      },
      {
        field: 'user.name',
        operator: 'included',
        type: 'wildcard',
        value: 'foo*',
      },
      {
        field: 'user.name',
        operator: 'excluded',
        type: 'wildcard',
        value: 'foo*',
      },
      {
        field: 'threat.indicator.port',
        operator: 'included',
        type: 'exists',
      },
      {
        field: 'threat.indicator.port',
        operator: 'excluded',
        type: 'exists',
      },
      {
        entries: [
          {
            field: 'valid',
            operator: 'included',
            type: 'match',
            value: 'true',
          },
        ],
        field: 'file.Ext.code_signature',
        type: 'nested',
        operator: 'included',
      },
    ];
    const wrapper = render(
      <ExceptionItemCardConditions
        entries={[
          {
            field: 'host.name',
            operator: 'included',
            type: 'match',
            value: 'host',
          },
          {
            field: 'host.name',
            operator: 'excluded',
            type: 'match',
            value: 'host',
          },
          {
            field: 'host.name',
            operator: 'included',
            type: 'match_any',
            value: ['foo', 'bar'],
          },
          {
            field: 'host.name',
            operator: 'excluded',
            type: 'match_any',
            value: ['foo', 'bar'],
          },
          {
            field: 'user.name',
            operator: 'included',
            type: 'wildcard',
            value: 'foo*',
          },
          {
            field: 'user.name',
            operator: 'excluded',
            type: 'wildcard',
            value: 'foo*',
          },
          {
            field: 'threat.indicator.port',
            operator: 'included',
            type: 'exists',
          },
          {
            field: 'threat.indicator.port',
            operator: 'excluded',
            type: 'exists',
          },
          {
            entries: [
              {
                field: 'valid',
                operator: 'included',
                type: 'match',
                value: 'true',
              },
            ],
            field: 'file.Ext.code_signature',
            type: 'nested',
          },
        ]}
        showValueListModal={MockedShowValueListModal}
        dataTestSubj="exceptionItemConditions"
      />
    );
    expect(wrapper.queryByTestId('exceptionItemConditionsOs')).not.toBeInTheDocument();

    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[0], '0')}EntryContent`)
    ).toHaveTextContent('host.nameIS host');
    // Match;
    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[1], '1')}EntryContent`)
    ).toHaveTextContent('AND host.nameIS NOT host');
    // MATCH_ANY;
    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[2], '2')}EntryContent`)
    ).toHaveTextContent('AND host.nameis one of foobar');
    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[3], '3')}EntryContent`)
    ).toHaveTextContent('AND host.nameis not one of foobar');
    // WILDCARD;
    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[4], '4')}EntryContent`)
    ).toHaveTextContent('AND user.nameMATCHES foo*');
    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[5], '5')}EntryContent`)
    ).toHaveTextContent('AND user.nameDOES NOT MATCH foo*');
    // EXISTS;
    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[6], '6')}EntryContent`)
    ).toHaveTextContent('AND threat.indicator.portexists');
    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[7], '7')}EntryContent`)
    ).toHaveTextContent('AND threat.indicator.portdoes not exist');
    // NESTED;
    expect(
      wrapper.getByTestId(`exceptionItemConditions${getEntryKey(entries[8], '8')}EntryContent`)
    ).toHaveTextContent('AND file.Ext.code_signature');
    if (entries[8] && entries[8].entries) {
      expect(
        wrapper.getByTestId(
          `exceptionItemConditions${getEntryKey(entries[8].entries[0], '0')}EntryContent`
        )
      ).toHaveTextContent('validIS true');
    }
  });
  it('it renders list conditions', () => {
    const entries: TestEntry[] = [
      {
        field: 'host.name',
        list: {
          id: 'ips.txt',
          type: 'keyword',
        },
        operator: 'included',
        type: 'list',
      },
      {
        field: 'host.name',
        list: {
          id: 'ips.txt',
          type: 'keyword',
        },
        operator: 'excluded',
        type: 'list',
      },
    ];
    const wrapper = render(
      <ExceptionItemCardConditions
        entries={[
          {
            field: 'host.name',
            list: {
              id: 'ips.txt',
              type: 'keyword',
            },
            operator: 'included',
            type: 'list',
          },
          {
            field: 'host.name',
            list: {
              id: 'ips.txt',
              type: 'keyword',
            },
            operator: 'excluded',
            type: 'list',
          },
        ]}
        showValueListModal={MockedShowValueListModal}
        dataTestSubj="exceptionItemConditions"
      />
    );
    // /exceptionItemConditionshost.namelist0EntryContent
    expect(
      wrapper.getByTestId(
        `exceptionItemConditions${getEntryKey(entries[0], '0', entries[0].list)}EntryContent`
      )
    ).toHaveTextContent('host.nameincluded in ips.txt');

    expect(
      wrapper.getByTestId(
        `exceptionItemConditions${getEntryKey(entries[1], '1', entries[1].list)}EntryContent`
      )
    ).toHaveTextContent('AND host.nameis not included in ips.txt');
  });
});
