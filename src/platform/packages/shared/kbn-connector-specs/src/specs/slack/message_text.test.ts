/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readSlackMessageText } from './message_text';

const MAX = 1000;

const nestRichText = (depth: number): Array<Record<string, unknown>> =>
  depth === 0
    ? [{ type: 'text', text: 'deep' }]
    : [{ type: 'rich_text_section', elements: nestRichText(depth - 1) }];

const nestContainers = (depth: number): Array<Record<string, unknown>> =>
  depth === 0
    ? [{ type: 'header', text: { text: 'deep' } }]
    : [{ type: 'container', child_blocks: nestContainers(depth - 1) }];

const section = (text: string) => ({ type: 'section', text: { type: 'mrkdwn', text } });

describe('readSlackMessageText', () => {
  it.each<[string, Record<string, unknown>, string | undefined]>([
    ['no text, blocks, or attachments', {}, undefined],
    ['plain text only', { text: 'hello' }, 'hello'],
    [
      'attachments with no text',
      {
        attachments: [
          {
            pretext: 'Incident #12',
            title: 'payments-api error rate high',
            text: '5xx rate 12%',
            fields: [
              { title: 'Service', value: 'payments-api' },
              { title: 'Env' },
              { value: 'prod' },
            ],
            footer: 'PagerDuty',
          },
        ],
      },
      [
        'Incident #12',
        'payments-api error rate high',
        '5xx rate 12%',
        'Service: payments-api',
        'Env',
        'prod',
        'PagerDuty',
      ].join('\n'),
    ],
    [
      'the attachment fallback only when the attachment has no other content',
      {
        attachments: [
          { fallback: 'unused fallback', title: 'Real title' },
          { fallback: 'only fallback' },
        ],
      },
      'Real title\nonly fallback',
    ],
    [
      'attachment blocks and a forwarded message',
      {
        attachments: [
          {
            blocks: [{ type: 'header', text: { text: 'Nested header' } }],
            message_blocks: [
              { message: { blocks: [section('Forwarded body')], text: 'ignored' } },
              { message: { text: 'Forwarded plain text' } },
              { message: 'not a message' },
            ],
          },
        ],
      },
      'Nested header\nForwarded body\nForwarded plain text',
    ],
    [
      'blocks with no text',
      {
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: 'Deploy failed' } },
          {
            ...section('*payments-api* is down'),
            fields: [{ type: 'mrkdwn', text: '*Region*\nus-east-1' }],
            accessory: { type: 'button', text: { text: 'Open' } },
          },
          { type: 'markdown', text: 'See the runbook' },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: 'Posted by Rootly' },
              { type: 'image', alt_text: 'logo' },
            ],
          },
          {
            type: 'actions',
            elements: [{ type: 'button', text: { text: 'Ack' } }, { type: 'button' }],
          },
          { type: 'image', alt_text: 'graph', title: { text: 'Latency' } },
          {
            type: 'video',
            title: { text: 'Walkthrough' },
            description: { text: 'How to roll back' },
          },
        ],
      },
      [
        'Deploy failed',
        '*payments-api* is down',
        '*Region*\nus-east-1',
        '[Open]',
        'See the runbook',
        'Posted by Rootly',
        'logo',
        '[Ack]',
        'graph',
        'Latency',
        'Walkthrough',
        'How to roll back',
      ].join('\n'),
    ],
    [
      'table, card, carousel, and container blocks',
      {
        blocks: [
          {
            type: 'table',
            caption: { text: 'Top errors' },
            rows: [
              [
                { type: 'raw_text', text: 'Service' },
                { type: 'raw_text', text: 'Rate' },
              ],
              [{ text: 'payments-api' }, { value: 12 }],
              [{ type: 'rich_text', elements: nestRichText(1) }, { value: 'n/a' }, {}],
              [{}, {}],
              'not a row',
            ],
          },
          {
            type: 'card',
            title: { text: 'Card title' },
            subtitle: { text: 'Card subtitle' },
            body: { text: 'Card body' },
            subtext: { text: 'Card subtext' },
            actions: [{ text: { text: 'Retry' } }],
          },
          { type: 'carousel', elements: [{ title: { text: 'Slide one' } }, 'not a card'] },
          {
            type: 'container',
            title: { text: 'Container title' },
            subtitle: { text: 'Container subtitle' },
            child_blocks: [section('Child body')],
          },
        ],
      },
      [
        'Top errors',
        'Service | Rate',
        'payments-api | 12',
        'deep | n/a | ',
        'Card title',
        'Card subtitle',
        'Card body',
        'Card subtext',
        '[Retry]',
        'Slide one',
        'Container title',
        'Container subtitle',
        'Child body',
      ].join('\n'),
    ],
    [
      'rich text with links, mentions, emoji, dates, and lists',
      {
        blocks: [
          {
            type: 'rich_text',
            elements: [
              {
                type: 'rich_text_section',
                elements: [
                  { type: 'text', text: 'Paging ' },
                  { type: 'user', user_id: 'U1' },
                  { type: 'usergroup', usergroup_id: 'S1' },
                  { type: 'text', text: ' in ' },
                  { type: 'channel', channel_id: 'C1' },
                  { type: 'broadcast', range: 'here' },
                  { type: 'text', text: ': ' },
                  { type: 'link', url: 'https://example.com/a', text: 'runbook' },
                  { type: 'link', url: 'https://example.com/b' },
                  { type: 'text', text: ' ' },
                  { type: 'link', text: 'no url' },
                  { type: 'emoji', name: 'fire' },
                  { type: 'date', fallback: ' 2026-10-22' },
                  { type: 'user' },
                  { type: 'unknown' },
                ],
              },
              {
                type: 'rich_text_list',
                elements: [
                  { type: 'rich_text_section', elements: [{ type: 'text', text: 'step one' }] },
                  { type: 'rich_text_section', elements: [{ type: 'text', text: 'step two' }] },
                ],
              },
            ],
          },
        ],
      },
      'Paging <@U1><!subteam^S1> in <#C1><!here>: <https://example.com/a|runbook><https://example.com/b> no url:fire: 2026-10-22\nstep one\nstep two',
    ],
    [
      'blocks and rich text that Slack already flattened into text',
      {
        text: 'Deploy failed *payments-api* is down *Region*\nus-east-1 *Version*\nv42 Open button Posted by Rootly Ack button Resolve button Paging <@U1> see <https://example.com/runbook|runbook>:fire:\n• step one\n• step two',
        blocks: [
          { type: 'header', text: { text: 'Deploy failed' } },
          {
            ...section('*payments-api* is down'),
            fields: [{ text: '*Region*\nus-east-1' }, { text: '*Version*\nv42' }],
            accessory: { type: 'button', text: { text: 'Open' } },
          },
          { type: 'context', elements: [{ type: 'mrkdwn', text: 'Posted by Rootly' }] },
          {
            type: 'actions',
            elements: [
              { type: 'button', text: { text: 'Ack' } },
              { type: 'button', text: { text: 'Resolve' } },
            ],
          },
          {
            type: 'rich_text',
            elements: [
              {
                type: 'rich_text_section',
                elements: [
                  { type: 'text', text: 'Paging ' },
                  { type: 'user', user_id: 'U1' },
                  { type: 'text', text: ' see ' },
                  { type: 'link', url: 'https://example.com/runbook', text: 'runbook' },
                  { type: 'emoji', name: 'fire' },
                ],
              },
              {
                type: 'rich_text_list',
                elements: [
                  { type: 'rich_text_section', elements: [{ type: 'text', text: 'step one' }] },
                  { type: 'rich_text_section', elements: [{ type: 'text', text: 'step two' }] },
                ],
              },
            ],
          },
        ],
      },
      'Deploy failed *payments-api* is down *Region*\nus-east-1 *Version*\nv42 Open button Posted by Rootly Ack button Resolve button Paging <@U1> see <https://example.com/runbook|runbook>:fire:\n• step one\n• step two',
    ],
    [
      'blocks that text only partly covers',
      { text: 'ALERT', blocks: [section('payments-api is down'), section('db-1 disk 98%')] },
      'ALERT\npayments-api is down\ndb-1 disk 98%',
    ],
    [
      'a headline and short values that text only contains inside a longer word',
      {
        text: 'prod-eu down',
        attachments: [
          { title: 'prod-eu down', fields: [{ title: 'Env', value: 'prod' }], text: 'p99 4s' },
        ],
      },
      'prod-eu down\np99 4s\nEnv: prod',
    ],
    [
      'a block that text only contains inside a longer host name',
      { text: 'node-10 down', blocks: [section('node-1')] },
      'node-10 down\nnode-1',
    ],
    [
      'repeated lines once, ignoring whitespace',
      { blocks: [section('same  line'), section('same line')] },
      'same  line',
    ],
    [
      'block types and shapes it does not read',
      {
        blocks: [
          { type: 'divider' },
          { type: 'unknown', text: { text: 'x' } },
          'not a block',
          null,
        ],
        attachments: ['not an attachment', { fields: 'not a list', blocks: 'not a list' }],
      },
      undefined,
    ],
    [
      'rich text nested deeper than the limit',
      { blocks: [{ type: 'rich_text', elements: nestRichText(10) }] },
      undefined,
    ],
    ['containers nested deeper than the limit', { blocks: nestContainers(10) }, undefined],
  ])('reads %s', (_name, source, expected) => {
    expect(readSlackMessageText(source, MAX)).toBe(expected);
  });

  it('does not cut an emoji in half at the maximum length', () => {
    expect(readSlackMessageText({ text: `ab${'😀'}cd` }, 3)).toBe('ab');
  });

  it('cuts the result to the maximum length', () => {
    expect(readSlackMessageText({ text: 'x'.repeat(20), attachments: [{ text: 'y' }] }, 10)).toBe(
      'x'.repeat(10)
    );
  });
});
